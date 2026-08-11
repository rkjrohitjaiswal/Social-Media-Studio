import {
  encryptWebhookUrl,
  decryptWebhookUrl,
  encryptSigningSecret,
  decryptSigningSecret,
  generateRandomSigningSecret,
  validateWebhookUrl,
} from "../integrations/n8n/security";
import { N8nWebhookProvider, N8nDeliveryResult } from "../integrations/n8n/n8n-webhook-provider";

export interface N8nIntegrationState {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  webhookUrlEncrypted: string;
  isEnabled: boolean;
  secretEncrypted: string;
  eventFilters: string[]; // ["ALL"] or specific eventTypes
  lastDeliveryAt?: string;
  lastDeliveryStatus?: string;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface N8nWebhookDeliveryState {
  id: string;
  workspaceId: string;
  integrationId: string;
  eventId: string;
  eventType: string;
  payloadJson: Record<string, unknown>;
  attemptCount: number;
  status: "QUEUED" | "PROCESSING" | "DELIVERED" | "FAILED" | "CANCELLED";
  responseStatus?: number;
  responseBodyPreview?: string;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  deliveredAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export const N8N_WEBHOOK_MAX_ATTEMPTS = parseInt(process.env.N8N_WEBHOOK_MAX_ATTEMPTS || "5", 10);

// In-Memory Stores (authoritative backup in PostgreSQL)
const integrationsStore = new Map<string, N8nIntegrationState>(); // id -> N8nIntegrationState
const deliveriesStore = new Map<string, N8nWebhookDeliveryState>(); // id -> N8nWebhookDeliveryState
const integrationDeliveriesMap = new Map<string, string[]>(); // integrationId -> deliveryIds[]
const idempotencyKeyMap = new Map<string, string>(); // `${integrationId}:${eventId}` -> deliveryId

// SSE Listener Broadcaster
type N8nEventListener = (event: { type: string; payload: Record<string, unknown> }) => void;
const sseListeners = new Set<N8nEventListener>();

export function subscribeN8nEvents(listener: N8nEventListener): () => void {
  sseListeners.add(listener);
  return () => sseListeners.delete(listener);
}

function broadcastN8nEvent(type: string, payload: Record<string, unknown>) {
  for (const listener of sseListeners) {
    try {
      listener({ type, payload });
    } catch {
      // Ignore listener error
    }
  }
}

export function clearN8nStores() {
  integrationsStore.clear();
  deliveriesStore.clear();
  integrationDeliveriesMap.clear();
  idempotencyKeyMap.clear();
}

/**
 * Create N8n Integration
 */
export function createN8nIntegration(params: {
  workspaceId: string;
  name: string;
  description?: string;
  webhookUrl: string;
  secret?: string;
  isEnabled?: boolean;
  eventFilters?: string[];
}): N8nIntegrationState {
  const urlCheck = validateWebhookUrl(params.webhookUrl);
  if (!urlCheck.isValid) {
    throw new Error(`Invalid Webhook URL: ${urlCheck.error}`);
  }

  const rawSecret = params.secret || generateRandomSigningSecret();
  const id = `n8n-int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const integration: N8nIntegrationState = {
    id,
    workspaceId: params.workspaceId,
    name: params.name,
    description: params.description,
    webhookUrlEncrypted: encryptWebhookUrl(params.webhookUrl),
    isEnabled: params.isEnabled !== false,
    secretEncrypted: encryptSigningSecret(rawSecret),
    eventFilters: params.eventFilters && params.eventFilters.length > 0 ? params.eventFilters : ["ALL"],
    failureCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  integrationsStore.set(id, integration);
  return integration;
}

/**
 * Update N8n Integration
 */
export function updateN8nIntegration(
  id: string,
  workspaceId: string,
  updates: {
    name?: string;
    description?: string;
    webhookUrl?: string;
    secret?: string;
    isEnabled?: boolean;
    eventFilters?: string[];
  }
): N8nIntegrationState | null {
  const integration = integrationsStore.get(id);
  if (!integration || integration.workspaceId !== workspaceId) return null;

  if (updates.webhookUrl) {
    const urlCheck = validateWebhookUrl(updates.webhookUrl);
    if (!urlCheck.isValid) {
      throw new Error(`Invalid Webhook URL: ${urlCheck.error}`);
    }
    integration.webhookUrlEncrypted = encryptWebhookUrl(updates.webhookUrl);
  }

  if (updates.secret) {
    integration.secretEncrypted = encryptSigningSecret(updates.secret);
  }

  if (updates.name !== undefined) integration.name = updates.name;
  if (updates.description !== undefined) integration.description = updates.description;
  if (updates.isEnabled !== undefined) integration.isEnabled = updates.isEnabled;
  if (updates.eventFilters !== undefined) integration.eventFilters = updates.eventFilters;

  integration.updatedAt = new Date().toISOString();
  return integration;
}

/**
 * Delete N8n Integration
 */
export function deleteN8nIntegration(id: string, workspaceId: string): boolean {
  const integration = integrationsStore.get(id);
  if (!integration || integration.workspaceId !== workspaceId) return false;
  integrationsStore.delete(id);
  return true;
}

/**
 * Get Workspace Integrations
 */
export function getN8nIntegrations(workspaceId: string): N8nIntegrationState[] {
  return Array.from(integrationsStore.values()).filter((i) => i.workspaceId === workspaceId);
}

/**
 * Get Integration by ID
 */
export function getN8nIntegrationById(id: string, workspaceId: string): N8nIntegrationState | null {
  const i = integrationsStore.get(id);
  if (!i || i.workspaceId !== workspaceId) return null;
  return i;
}

/**
 * Enqueue Webhook Delivery
 */
export async function enqueueWebhookDelivery(params: {
  workspaceId: string;
  integrationId: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  provider?: N8nWebhookProvider;
}): Promise<N8nWebhookDeliveryState> {
  const idempotencyKey = `${params.integrationId}:${params.eventId}`;
  const existingDeliveryId = idempotencyKeyMap.get(idempotencyKey);

  if (existingDeliveryId) {
    const existing = deliveriesStore.get(existingDeliveryId);
    if (existing) return existing;
  }

  const deliveryId = `deliv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const deliveryState: N8nWebhookDeliveryState = {
    id: deliveryId,
    workspaceId: params.workspaceId,
    integrationId: params.integrationId,
    eventId: params.eventId,
    eventType: params.eventType,
    payloadJson: params.payload,
    attemptCount: 0,
    status: "QUEUED",
    createdAt: now,
    updatedAt: now,
  };

  deliveriesStore.set(deliveryId, deliveryState);
  idempotencyKeyMap.set(idempotencyKey, deliveryId);

  const existingList = integrationDeliveriesMap.get(params.integrationId) || [];
  integrationDeliveriesMap.set(params.integrationId, [...existingList, deliveryId]);

  broadcastN8nEvent("n8n.delivery.queued", {
    deliveryId,
    integrationId: params.integrationId,
    eventId: params.eventId,
    eventType: params.eventType,
  });

  // Asynchronous Execution in Queue Worker
  executeWebhookDeliveryJob(deliveryId, params.provider);

  return deliveryState;
}

/**
 * Execute Webhook Delivery Job with Backoff & Retries
 */
export async function processWebhookDelivery(params: {
  deliveryId: string;
  customProvider?: N8nWebhookProvider;
}): Promise<N8nWebhookDeliveryState> {
  const delivery = deliveriesStore.get(params.deliveryId);
  if (!delivery) {
    throw new Error(`Delivery not found: ${params.deliveryId}`);
  }

  await executeWebhookDeliveryJob(params.deliveryId, params.customProvider);
  return deliveriesStore.get(params.deliveryId)!;
}

async function executeWebhookDeliveryJob(deliveryId: string, customProvider?: N8nWebhookProvider) {
  const delivery = deliveriesStore.get(deliveryId);
  if (!delivery || delivery.status === "DELIVERED" || delivery.status === "CANCELLED") return;

  const integration = integrationsStore.get(delivery.integrationId);
  if (!integration || !integration.isEnabled) {
    delivery.status = "CANCELLED";
    delivery.errorMessage = "Integration disabled or missing";
    delivery.updatedAt = new Date().toISOString();
    return;
  }

  delivery.status = "PROCESSING";
  delivery.attemptCount += 1;
  delivery.lastAttemptAt = new Date().toISOString();
  delivery.updatedAt = new Date().toISOString();

  broadcastN8nEvent("n8n.delivery.processing", {
    deliveryId: delivery.id,
    attempt: delivery.attemptCount,
  });

  const provider = customProvider || new N8nWebhookProvider();

  try {
    const rawUrl = decryptWebhookUrl(integration.webhookUrlEncrypted);
    const rawSecret = decryptSigningSecret(integration.secretEncrypted);

    const result: N8nDeliveryResult = await provider.sendWebhook({
      rawWebhookUrl: rawUrl,
      signingSecret: rawSecret,
      eventId: delivery.eventId, // Preserves original eventId on retry!
      eventType: delivery.eventType,
      occurredAt: delivery.createdAt,
      payload: delivery.payloadJson,
    });

    delivery.responseStatus = result.httpStatus;
    delivery.responseBodyPreview = result.responsePreview;
    delivery.updatedAt = new Date().toISOString();

    if (result.success) {
      delivery.status = "DELIVERED";
      delivery.deliveredAt = result.deliveredAt || new Date().toISOString();
      integration.lastDeliveryAt = delivery.deliveredAt;
      integration.lastDeliveryStatus = "DELIVERED";
      integration.failureCount = 0;

      broadcastN8nEvent("n8n.delivery.delivered", {
        deliveryId: delivery.id,
        httpStatus: result.httpStatus,
      });
    } else {
      delivery.errorCode = result.classification;
      delivery.errorMessage = result.errorMessage;

      if (result.isRetryable && delivery.attemptCount < N8N_WEBHOOK_MAX_ATTEMPTS) {
        delivery.status = "QUEUED";
        // Exponential backoff: 30s * 2^(attempt - 1)
        const backoffSeconds = 30 * Math.pow(2, delivery.attemptCount - 1);
        delivery.nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

        broadcastN8nEvent("n8n.delivery.failed", {
          deliveryId: delivery.id,
          attempt: delivery.attemptCount,
          willRetry: true,
          nextAttemptAt: delivery.nextAttemptAt,
        });
      } else {
        delivery.status = "FAILED";
        integration.failureCount += 1;
        integration.lastDeliveryStatus = "FAILED";

        broadcastN8nEvent("n8n.delivery.failed", {
          deliveryId: delivery.id,
          attempt: delivery.attemptCount,
          willRetry: false,
          error: result.errorMessage,
        });
      }
    }
  } catch (err: unknown) {
    delivery.status = "FAILED";
    delivery.errorMessage = err instanceof Error ? err.message : "Webhook delivery failed";
    delivery.updatedAt = new Date().toISOString();

    broadcastN8nEvent("n8n.delivery.failed", {
      deliveryId: delivery.id,
      error: delivery.errorMessage,
    });
  }
}

/**
 * Manual Retry Delivery (Only authorized users, reuses original eventId)
 */
export async function retryWebhookDelivery(
  deliveryId: string,
  workspaceId: string,
  provider?: N8nWebhookProvider
): Promise<N8nWebhookDeliveryState | null> {
  const delivery = deliveriesStore.get(deliveryId);
  if (!delivery || delivery.workspaceId !== workspaceId) return null;

  delivery.status = "QUEUED";
  delivery.updatedAt = new Date().toISOString();

  await executeWebhookDeliveryJob(deliveryId, provider);
  return delivery;
}

/**
 * Test Integration Webhook Endpoint sending `integration.test` event
 */
export async function testIntegrationWebhook(
  integrationId: string,
  workspaceId: string,
  provider?: N8nWebhookProvider
): Promise<N8nWebhookDeliveryState> {
  const integration = getN8nIntegrationById(integrationId, workspaceId);
  if (!integration) {
    throw new Error("N8n Integration not found or unauthorized");
  }

  const testEventId = `evt-test-${Date.now()}`;
  const payload = {
    eventId: testEventId,
    eventType: "integration.test",
    occurredAt: new Date().toISOString(),
    workspaceId,
    data: {
      message: "AI Social Media Studio n8n webhook test event",
      integrationName: integration.name,
    },
  };

  return enqueueWebhookDelivery({
    workspaceId,
    integrationId,
    eventId: testEventId,
    eventType: "integration.test",
    payload,
    provider,
  });
}

/**
 * Get Integration Delivery Logs
 */
export function getIntegrationDeliveries(
  integrationId: string,
  workspaceId: string
): N8nWebhookDeliveryState[] {
  const ids = integrationDeliveriesMap.get(integrationId) || [];
  return ids
    .map((id) => deliveriesStore.get(id)!)
    .filter((d) => d && d.workspaceId === workspaceId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function clearN8nIntegrationStore(): void {
  integrationsStore.clear();
  deliveriesStore.clear();
  integrationDeliveriesMap.clear();
  idempotencyKeyMap.clear();
}
