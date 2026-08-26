/**
 * Phase 2F Part 2 — Inbound n8n Webhook Callback Tests
 *
 * Requirements tested:
 *   1. Valid HMAC-SHA256 signature is accepted (200)
 *   2. Invalid signature is rejected (401)
 *   3. Missing signature header is rejected (401)
 *   4. Malformed JSON payload is rejected (400)
 *   5. CONTENT_STATUS_UPDATED succeeds for allowed status values (DRAFT, READY, APPROVED, SCHEDULED, FAILED)
 *   6. Unsupported/arbitrary status values are rejected (400)
 *   7. Workspace isolation is enforced (403 when target belongs to different workspace)
 *   8. Missing target record is rejected (404)
 *   9. Duplicate eventId is rejected via replay protection (409)
 *  10. MEDIA_RENDER_COMPLETED is handled successfully
 *  11. Webhook secrets are NEVER rendered or exposed in response output or logs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "crypto";
import {
  processInboundN8nCallback,
  registerTestWebhookSecret,
  clearRegisteredWebhookSecrets,
  clearProcessedEventsLedger,
} from "../apps/api/src/services/n8n-inbound-service";

const { contentPlanItemsStore, scheduledPostsStore } = vi.hoisted(() => ({
  contentPlanItemsStore: new Map<string, any>(),
  scheduledPostsStore: new Map<string, any>(),
}));

vi.mock("@ai-social/database", () => {
  return {
    prisma: {
      contentPlanItem: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          return contentPlanItemsStore.get(where.id) || null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = contentPlanItemsStore.get(where.id);
          if (existing) {
            Object.assign(existing, data);
            contentPlanItemsStore.set(where.id, existing);
            return existing;
          }
          throw new Error("ContentPlanItem not found");
        }),
      },
      scheduledPost: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          return scheduledPostsStore.get(where.id) || null;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = scheduledPostsStore.get(where.id);
          if (existing) {
            Object.assign(existing, data);
            scheduledPostsStore.set(where.id, existing);
            return existing;
          }
          throw new Error("ScheduledPost not found");
        }),
      },
      n8nIntegration: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  };
});

const WS_A = "ws-inbound-alpha-101";
const WS_B = "ws-inbound-beta-202";
const SECRET_A = "super_secret_webhook_key_12345";
const SECRET_B = "super_secret_webhook_key_99999";

function computeSignatureHeader(payload: any, secret: string): string {
  const bodyStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const hex = createHmac("sha256", secret).update(bodyStr, "utf8").digest("hex");
  return `sha256=${hex}`;
}

describe("Phase 2F Part 2 — Inbound n8n Webhook Callbacks", () => {
  beforeEach(() => {
    clearRegisteredWebhookSecrets();
    clearProcessedEventsLedger();
    contentPlanItemsStore.clear();
    scheduledPostsStore.clear();
    registerTestWebhookSecret(WS_A, SECRET_A);
    registerTestWebhookSecret(WS_B, SECRET_B);
  });

  afterEach(() => {
    clearRegisteredWebhookSecrets();
    clearProcessedEventsLedger();
  });

  // ── 1. Valid Signature Accepted ──────────────────────────────────────────

  it("1. accepts valid HMAC signature and returns 200", async () => {
    contentPlanItemsStore.set("cpi-inbound-1", {
      id: "cpi-inbound-1",
      workspaceId: WS_A,
      status: "DRAFT",
    });

    const payload = {
      eventId: "evt-valid-1",
      eventType: "CONTENT_STATUS_UPDATED",
      workspaceId: WS_A,
      targetId: "cpi-inbound-1",
      status: "APPROVED",
    };

    const sig = computeSignatureHeader(payload, SECRET_A);
    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);

    expect(result.status).toBe(200);
    expect(result.success).toBe(true);
    expect(contentPlanItemsStore.get("cpi-inbound-1").status).toBe("APPROVED");
  });

  // ── 2. Invalid Signature Rejected ────────────────────────────────────────

  it("2. rejects invalid signature with 401 Unauthorized", async () => {
    const payload = {
      eventId: "evt-invalid-sig",
      eventType: "CONTENT_STATUS_UPDATED",
      workspaceId: WS_A,
      targetId: "cpi-inbound-1",
      status: "APPROVED",
    };

    const invalidSig = "sha256=bad_hex_signature_0000000000000000000000000000000000000000";
    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), invalidSig);

    expect(result.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid webhook signature");
  });

  // ── 3. Missing Signature Rejected ────────────────────────────────────────

  it("3. rejects missing signature header with 401 Unauthorized", async () => {
    const payload = {
      eventId: "evt-no-sig",
      eventType: "CONTENT_STATUS_UPDATED",
      workspaceId: WS_A,
    };

    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), undefined);

    expect(result.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing X-Studio-Signature header");
  });

  // ── 4. Malformed Payload Rejected ────────────────────────────────────────

  it("4. rejects malformed payload with 400 Bad Request", async () => {
    const payload = { invalidField: true };
    const sig = computeSignatureHeader(payload, SECRET_A);
    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);

    expect(result.status).toBe(400);
    expect(result.success).toBe(false);
  });

  // ── 5. CONTENT_STATUS_UPDATED Succeeds ───────────────────────────────────

  it("5. CONTENT_STATUS_UPDATED updates status for allowed states", async () => {
    contentPlanItemsStore.set("cpi-status-1", {
      id: "cpi-status-1",
      workspaceId: WS_A,
      status: "DRAFT",
    });

    const payload = {
      eventId: "evt-status-change",
      eventType: "CONTENT_STATUS_UPDATED",
      workspaceId: WS_A,
      targetId: "cpi-status-1",
      status: "SCHEDULED",
    };

    const sig = computeSignatureHeader(payload, SECRET_A);
    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);

    expect(result.status).toBe(200);
    expect(contentPlanItemsStore.get("cpi-status-1").status).toBe("SCHEDULED");
  });

  // ── 6. Unsupported Status Rejected ────────────────────────────────────────

  it("6. rejects unsupported or arbitrary status transitions with 400 Bad Request", async () => {
    contentPlanItemsStore.set("cpi-status-2", {
      id: "cpi-status-2",
      workspaceId: WS_A,
      status: "DRAFT",
    });

    const payload = {
      eventId: "evt-bad-status",
      eventType: "CONTENT_STATUS_UPDATED",
      workspaceId: WS_A,
      targetId: "cpi-status-2",
      status: "ADMIN_OVERRIDE_HACK",
    };

    const sig = computeSignatureHeader(payload, SECRET_A);
    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);

    expect(result.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unsupported or disallowed status transition");
  });

  // ── 7. Workspace Isolation Enforced ──────────────────────────────────────

  it("7. enforces workspace isolation (rejects cross-workspace updates with 403)", async () => {
    // Target record belongs to Workspace B
    contentPlanItemsStore.set("cpi-ws-b", {
      id: "cpi-ws-b",
      workspaceId: WS_B,
      status: "DRAFT",
    });

    // Callback claims to come from Workspace A
    const payload = {
      eventId: "evt-cross-ws",
      eventType: "CONTENT_STATUS_UPDATED",
      workspaceId: WS_A,
      targetId: "cpi-ws-b",
      status: "APPROVED",
    };

    const sig = computeSignatureHeader(payload, SECRET_A);
    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);

    expect(result.status).toBe(403);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Workspace access denied");
    expect(contentPlanItemsStore.get("cpi-ws-b").status).toBe("DRAFT");
  });

  // ── 8. Missing Target Rejected ───────────────────────────────────────────

  it("8. rejects callback with 404 Not Found when target record does not exist", async () => {
    const payload = {
      eventId: "evt-missing-target",
      eventType: "CONTENT_STATUS_UPDATED",
      workspaceId: WS_A,
      targetId: "non-existent-target-id",
      status: "APPROVED",
    };

    const sig = computeSignatureHeader(payload, SECRET_A);
    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);

    expect(result.status).toBe(404);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Target content record not found");
  });

  // ── 9. Replay Protection (Duplicate Event Prevention) ─────────────────────

  it("9. prevents processing duplicate callback eventId with 409 Conflict", async () => {
    contentPlanItemsStore.set("cpi-replay-1", {
      id: "cpi-replay-1",
      workspaceId: WS_A,
      status: "DRAFT",
    });

    const payload = {
      eventId: "evt-replay-unique-999",
      eventType: "CONTENT_STATUS_UPDATED",
      workspaceId: WS_A,
      targetId: "cpi-replay-1",
      status: "READY",
    };

    const sig = computeSignatureHeader(payload, SECRET_A);

    // First call succeeds
    const firstResult = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);
    expect(firstResult.status).toBe(200);

    // Second call with same eventId returns 409
    const secondResult = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);
    expect(secondResult.status).toBe(409);
    expect(secondResult.error).toContain("Duplicate webhook eventId");
  });

  // ── 10. MEDIA_RENDER_COMPLETED Handled ────────────────────────────────────

  it("10. MEDIA_RENDER_COMPLETED callback is processed successfully", async () => {
    contentPlanItemsStore.set("cpi-media-1", {
      id: "cpi-media-1",
      workspaceId: WS_A,
      status: "APPROVED",
    });

    const payload = {
      eventId: "evt-media-render-1",
      eventType: "MEDIA_RENDER_COMPLETED",
      workspaceId: WS_A,
      targetId: "cpi-media-1",
      mediaUrl: "https://storage.aisocial.studio/renders/render_101.mp4",
    };

    const sig = computeSignatureHeader(payload, SECRET_A);
    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);

    expect(result.status).toBe(200);
    expect(result.success).toBe(true);
  });

  // ── 11. Secret Safety ─────────────────────────────────────────────────────

  it("11. webhook secret is NEVER returned or rendered in callback responses", async () => {
    const payload = {
      eventId: "evt-secret-safety",
      eventType: "CONTENT_STATUS_UPDATED",
      workspaceId: WS_A,
      targetId: "cpi-inbound-1",
      status: "APPROVED",
    };

    const sig = computeSignatureHeader(payload, SECRET_A);
    const result = await processInboundN8nCallback(payload, JSON.stringify(payload), sig);
    const resStr = JSON.stringify(result);

    expect(resStr).not.toContain(SECRET_A);
    expect(resStr).not.toContain("secretEncrypted");
  });
});
