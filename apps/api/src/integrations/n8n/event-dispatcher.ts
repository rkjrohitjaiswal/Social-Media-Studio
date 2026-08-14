import { getN8nIntegrations, enqueueWebhookDelivery } from "../../workers/n8n-webhook-worker";
import { N8nWebhookProvider } from "./n8n-webhook-provider";

export type N8nSupportedEventType =
  | "campaign.created"
  | "campaign.generation.started"
  | "campaign.generation.completed"
  | "campaign.generation.failed"
  | "social_copy.completed"
  | "quality.completed"
  | "review.approved"
  | "review.rejected"
  | "review.changes_requested"
  | "instagram.published"
  | "schedule.created"
  | "schedule.cancelled"
  | "schedule.published"
  | "schedule.failed"
  | "analytics.sync.completed"
  | "analytics.sync.failed"
  | "integration.test"
  | "social.content.created"
  | "social.content.approved"
  | "social.content.scheduled"
  | "social.content.published"
  | "social.content.failed";

export interface NormalizedN8nEvent {
  eventId: string;
  eventType: N8nSupportedEventType;
  occurredAt: string;
  workspaceId: string;
  data: Record<string, unknown>;
}

/**
 * Dispatch normalized N8n application event.
 * Asynchronous & fire-and-forget — NEVER blocks originating application request.
 */
export async function dispatchN8nEvent(params: {
  eventType: N8nSupportedEventType;
  workspaceId: string;
  data: Record<string, unknown>;
  customEventId?: string;
  provider?: N8nWebhookProvider;
}): Promise<{ dispatchedCount: number; eventId: string }> {
  const eventId = params.customEventId || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const occurredAt = new Date().toISOString();

  // Clean data: Ensure no secrets or sensitive keys are present
  const safeData = sanitizePayloadData(params.data);

  const eventPayload: NormalizedN8nEvent = {
    eventId,
    eventType: params.eventType,
    occurredAt,
    workspaceId: params.workspaceId,
    data: safeData,
  };

  // Find matching enabled integrations for this workspace
  const integrations = getN8nIntegrations(params.workspaceId).filter((i) => i.isEnabled);
  let dispatchedCount = 0;

  for (const integration of integrations) {
    // Event filter check
    const isSubscribed =
      integration.eventFilters.includes("ALL") ||
      integration.eventFilters.includes(params.eventType);

    if (isSubscribed) {
      dispatchedCount++;
      // Asynchronously enqueue webhook delivery (fire-and-forget)
      enqueueWebhookDelivery({
        workspaceId: params.workspaceId,
        integrationId: integration.id,
        eventId,
        eventType: params.eventType,
        payload: eventPayload as unknown as Record<string, unknown>,
        provider: params.provider,
      }).catch(() => {
        // Suppress async background errors so originating request never fails
      });
    }
  }

  return { dispatchedCount, eventId };
}

/**
 * Sanitize event data to ensure secrets, access tokens, and private keys are never included
 */
function sanitizePayloadData(data: Record<string, unknown> | undefined | null): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("token") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("password") ||
      lowerKey.includes("key") ||
      lowerKey.includes("credential")
    ) {
      continue; // Strip secret fields
    }
    sanitized[key] = value;
  }

  return sanitized;
}
