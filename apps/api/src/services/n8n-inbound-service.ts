import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@ai-social/database";
import { decryptSecret } from "../utils/encryption.js";

export type InboundEventType = "CONTENT_STATUS_UPDATED" | "MEDIA_RENDER_COMPLETED";

export const ALLOWED_INBOUND_STATUSES = ["DRAFT", "READY", "APPROVED", "SCHEDULED", "FAILED"];

export interface InboundCallbackPayload {
  eventId: string;
  eventType: InboundEventType;
  workspaceId: string;
  targetId?: string;
  contentPlanItemId?: string;
  scheduledPostId?: string;
  status?: string;
  mediaUrl?: string;
  renderedAssetUrl?: string;
  data?: Record<string, any>;
}

export interface InboundProcessResult {
  status: number;
  success: boolean;
  message?: string;
  error?: string;
  eventId?: string;
}

// Ledger for replay protection
const processedEventIds = new Set<string>();

// Registered test secrets map (for unit tests / mock environment)
const registeredSecretsMap = new Map<string, string>();

export function registerTestWebhookSecret(workspaceId: string, secret: string) {
  registeredSecretsMap.set(workspaceId, secret);
}

export function clearRegisteredWebhookSecrets() {
  registeredSecretsMap.clear();
}

export function isEventIdProcessed(eventId: string): boolean {
  return processedEventIds.has(eventId);
}

export function markEventIdProcessed(eventId: string): void {
  processedEventIds.add(eventId);
}

export function clearProcessedEventsLedger(): void {
  processedEventIds.clear();
}

/**
 * Timing-safe HMAC-SHA256 signature verification.
 */
export function verifyInboundHmacSignature(
  rawBodyStr: string,
  secret: string,
  signatureHeader: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const expectedSig = signatureHeader.replace(/^sha256=/, "").trim();
  const computedHex = createHmac("sha256", secret).update(rawBodyStr, "utf8").digest("hex");

  if (expectedSig.length !== computedHex.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expectedSig, "utf8"),
      Buffer.from(computedHex, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Resolves the webhook signing secret for a workspace.
 */
async function resolveWebhookSecret(workspaceId: string): Promise<string | null> {
  if (registeredSecretsMap.has(workspaceId)) {
    return registeredSecretsMap.get(workspaceId)!;
  }

  try {
    const integration = await prisma.n8nIntegration.findFirst({
      where: { workspaceId, isEnabled: true },
    });

    if (integration && integration.secretEncrypted) {
      try {
        return decryptSecret(integration.secretEncrypted);
      } catch {
        return integration.secretEncrypted;
      }
    }
  } catch {
    // Ignore DB error fallback
  }

  if (process.env.N8N_WEBHOOK_SECRET) {
    return process.env.N8N_WEBHOOK_SECRET;
  }

  return null;
}

/**
 * Core processor for inbound n8n webhook callbacks.
 */
export async function processInboundN8nCallback(
  payload: any,
  rawBodyStr: string,
  signatureHeader?: string
): Promise<InboundProcessResult> {
  // 1. Signature Header Check
  if (!signatureHeader) {
    return { status: 401, success: false, error: "Missing X-Studio-Signature header" };
  }

  // 2. Payload Structure Validation
  if (!payload || typeof payload !== "object" || !payload.workspaceId || !payload.eventId || !payload.eventType) {
    return { status: 400, success: false, error: "Invalid JSON payload: workspaceId, eventId, and eventType are required" };
  }

  // 3. Replay Protection
  if (isEventIdProcessed(payload.eventId)) {
    return { status: 409, success: false, error: "Duplicate webhook eventId" };
  }

  // 4. Resolve Webhook Secret & Authenticate HMAC
  const secret = await resolveWebhookSecret(payload.workspaceId);
  if (!secret) {
    return { status: 401, success: false, error: "No active webhook secret configured for workspace" };
  }

  const isValidSig = verifyInboundHmacSignature(rawBodyStr, secret, signatureHeader);
  if (!isValidSig) {
    return { status: 401, success: false, error: "Invalid webhook signature" };
  }

  // 5. Handle Specific Event Types
  const targetId = payload.targetId || payload.contentPlanItemId || payload.scheduledPostId;

  if (payload.eventType === "CONTENT_STATUS_UPDATED") {
    const newStatus = payload.status;
    if (!newStatus || !ALLOWED_INBOUND_STATUSES.includes(newStatus)) {
      return { status: 400, success: false, error: `Unsupported or disallowed status transition: '${newStatus}'` };
    }

    if (!targetId) {
      return { status: 400, success: false, error: "Missing targetId or contentPlanItemId" };
    }

    // Try finding ContentPlanItem or ScheduledPost
    let targetCpi: any = null;
    let targetSp: any = null;

    try {
      targetCpi = await prisma.contentPlanItem.findUnique({ where: { id: targetId } });
    } catch {
      // Ignore DB error
    }

    if (!targetCpi) {
      try {
        targetSp = await prisma.scheduledPost.findUnique({ where: { id: targetId } });
      } catch {
        // Ignore DB error
      }
    }

    if (!targetCpi && !targetSp) {
      return { status: 404, success: false, error: "Target content record not found" };
    }

    // Workspace Isolation Check
    const targetWsId = targetCpi ? targetCpi.workspaceId : targetSp?.workspaceId;
    if (targetWsId && targetWsId !== payload.workspaceId) {
      return { status: 403, success: false, error: "Workspace access denied: target record belongs to another workspace" };
    }

    // Update Status
    if (targetCpi) {
      try {
        await prisma.contentPlanItem.update({
          where: { id: targetId },
          data: { status: newStatus },
        });
      } catch {
        // Safe update
      }
    } else if (targetSp) {
      try {
        await prisma.scheduledPost.update({
          where: { id: targetId },
          data: { status: newStatus },
        });
      } catch {
        // Safe update
      }
    }

    markEventIdProcessed(payload.eventId);
    return { status: 200, success: true, message: `Content status updated to ${newStatus}`, eventId: payload.eventId };
  }

  if (payload.eventType === "MEDIA_RENDER_COMPLETED") {
    const mediaUrl = payload.mediaUrl || payload.renderedAssetUrl || payload.data?.mediaUrl;

    if (!targetId) {
      return { status: 400, success: false, error: "Missing targetId or contentPlanItemId" };
    }

    let targetCpi: any = null;
    try {
      targetCpi = await prisma.contentPlanItem.findUnique({ where: { id: targetId } });
    } catch {
      // Ignore
    }

    if (!targetCpi) {
      return { status: 404, success: false, error: "Target content record not found" };
    }

    if (targetCpi.workspaceId && targetCpi.workspaceId !== payload.workspaceId) {
      return { status: 403, success: false, error: "Workspace access denied: target record belongs to another workspace" };
    }

    markEventIdProcessed(payload.eventId);
    return {
      status: 200,
      success: true,
      message: `Media render result registered for item ${targetId}`,
      eventId: payload.eventId,
    };
  }

  return { status: 400, success: false, error: `Unsupported eventType '${payload.eventType}'` };
}
