import { prisma } from "@ai-social/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export type WebhookEventType = "CONTENT_APPROVED" | "CONTENT_CHANGES_REQUESTED" | "POST_SCHEDULED" | "POST_PUBLISHED";

export interface WebhookPayload {
  eventType: WebhookEventType;
  eventId: string;
  workspaceId: string;
  userId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Delivery result (internal only — never sent to frontend)
interface DeliveryResult {
  integrationId: string;
  eventId: string;
  status: "DELIVERED" | "FAILED" | "TIMEOUT";
  responseStatus?: number;
  errorMessage?: string;
}

// ─── In-memory delivery log (test / fallback when DB is unavailable) ─────────

const inMemoryDeliveries: Map<string, DeliveryResult & { payload: WebhookPayload; createdAt: string }> = new Map();

export function getInMemoryDeliveries() {
  return inMemoryDeliveries;
}

export function clearInMemoryDeliveries() {
  inMemoryDeliveries.clear();
}

// ─── Core: fire a single webhook with timeout ─────────────────────────────────

const WEBHOOK_TIMEOUT_MS = 8_000; // 8 s — generous for external n8n

async function fireWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string
): Promise<{ status: number; body: string }> {
  const bodyStr = JSON.stringify(payload);

  // HMAC-SHA256 signature so the receiver can verify authenticity.
  // The secret is NEVER logged or exposed to the frontend here.
  const { createHmac } = await import("crypto");
  const signature = createHmac("sha256", secret).update(bodyStr).digest("hex");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Studio-Signature": `sha256=${signature}`,
        "X-Studio-Event": payload.eventType,
      },
      body: bodyStr,
      signal: controller.signal,
    });
    const body = await res.text().catch(() => "");
    return { status: res.status, body: body.slice(0, 500) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("aborted") || msg.includes("AbortError")) {
      throw new Error("TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Persist delivery attempt to DB (best-effort, non-blocking) ──────────────

async function persistDelivery(
  workspaceId: string,
  integrationId: string,
  payload: WebhookPayload,
  result: DeliveryResult
): Promise<void> {
  const now = new Date();
  const uniqueEventId = `${integrationId}_${payload.eventId}`;

  // In-memory always recorded (for unit tests / fallback)
  inMemoryDeliveries.set(uniqueEventId, {
    ...result,
    payload,
    createdAt: now.toISOString(),
  });

  try {
    await prisma.n8nWebhookDelivery.upsert({
      where: { integrationId_eventId: { integrationId, eventId: payload.eventId } },
      create: {
        workspaceId,
        integrationId,
        eventId: payload.eventId,
        eventType: payload.eventType,
        payloadJson: payload as any,
        attemptCount: 1,
        status: result.status,
        responseStatus: result.responseStatus ?? null,
        responseBodyPreview: null,
        lastAttemptAt: now,
        deliveredAt: result.status === "DELIVERED" ? now : null,
        errorCode: result.status !== "DELIVERED" ? result.status : null,
        errorMessage: result.errorMessage ?? null,
      },
      update: {
        attemptCount: { increment: 1 },
        status: result.status,
        responseStatus: result.responseStatus ?? null,
        lastAttemptAt: now,
        deliveredAt: result.status === "DELIVERED" ? now : null,
        errorCode: result.status !== "DELIVERED" ? result.status : null,
        errorMessage: result.errorMessage ?? null,
      },
    });

    // Keep integration-level stats up to date
    await prisma.n8nIntegration.update({
      where: { id: integrationId },
      data: {
        lastDeliveryAt: now,
        lastDeliveryStatus: result.status,
        failureCount:
          result.status !== "DELIVERED"
            ? { increment: 1 }
            : { set: 0 },
      },
    });
  } catch {
    // DB unavailable — already recorded in-memory; caller is unaffected.
  }
}

// ─── Public: dispatch event to all enabled integrations for a workspace ───────

/**
 * Dispatches a webhook event to every ENABLED N8nIntegration for the given
 * workspace. Runs fire-and-forget so that the calling request (approval /
 * schedule) is NEVER blocked or failed by a webhook error.
 *
 * Security guarantees:
 * - Webhook URLs and secrets are read server-side from the DB (never from client).
 * - Secrets are used only to sign the HMAC — they are never returned to callers.
 * - workspaceId is validated server-side (must own the integration record).
 */
export function dispatchWebhookEvent(
  workspaceId: string,
  userId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): void {
  // Generate stable eventId from type + primary entity + timestamp
  const entityId = (data.approvalId ?? data.scheduledPostId ?? data.contentPlanItemId ?? data.id ?? "unknown") as string;
  const eventId = `${eventType}_${entityId}_${Date.now()}`;

  const payload: WebhookPayload = {
    eventType,
    eventId,
    workspaceId,
    userId,
    timestamp: new Date().toISOString(),
    data,
  };

  // Non-blocking — intentionally not awaited
  void (async () => {
    let integrations: Array<{ id: string; webhookUrlEncrypted: string; secretEncrypted: string }> = [];

    try {
      integrations = await prisma.n8nIntegration.findMany({
        where: {
          workspaceId, // workspace isolation enforced here
          isEnabled: true,
        },
        select: {
          id: true,
          webhookUrlEncrypted: true,
          secretEncrypted: true,
        },
      });
    } catch {
      // DB unavailable — nothing to dispatch; log in-memory
      inMemoryDeliveries.set(`no_db_${eventId}`, {
        integrationId: "none",
        eventId,
        status: "FAILED",
        errorMessage: "DB unavailable for integration lookup",
        payload,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    for (const integration of (integrations || [])) {
      // In production these would be decrypted from AES-256 storage.
      // For the foundation we store the URL/secret as plaintext prefixed
      // with "plain:" to signal no encryption yet, falling back to the raw value.
      const url = integration.webhookUrlEncrypted.startsWith("plain:")
        ? integration.webhookUrlEncrypted.slice(6)
        : integration.webhookUrlEncrypted;

      const secret = integration.secretEncrypted.startsWith("plain:")
        ? integration.secretEncrypted.slice(6)
        : integration.secretEncrypted;

      let result: DeliveryResult;
      try {
        const { status, body } = await fireWebhook(url, payload, secret);
        result = {
          integrationId: integration.id,
          eventId,
          status: status >= 200 && status < 300 ? "DELIVERED" : "FAILED",
          responseStatus: status,
          errorMessage: status >= 300 ? `HTTP ${status}: ${body}` : undefined,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        result = {
          integrationId: integration.id,
          eventId,
          status: msg === "TIMEOUT" ? "TIMEOUT" : "FAILED",
          errorMessage: msg,
        };
      }

      // Persist delivery (best-effort, non-blocking to the caller)
      await persistDelivery(workspaceId, integration.id, payload, result);
    }
  })();
}
