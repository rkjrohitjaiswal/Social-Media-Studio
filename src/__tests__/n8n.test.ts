import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateWebhookUrl,
  generateWebhookSignature,
  verifyWebhookSignature,
  verifyTimestampTolerance,
  encryptWebhookUrl,
  decryptWebhookUrl,
  encryptSigningSecret,
  decryptSigningSecret,
} from "../lib/integrations/n8n/security";
import { N8nWebhookProvider } from "../lib/integrations/n8n/n8n-webhook-provider";
import {
  clearN8nStores,
  createN8nIntegration,
  getN8nIntegrations,
  enqueueWebhookDelivery,
  retryWebhookDelivery,
  testIntegrationWebhook,
  subscribeN8nEvents,
} from "../lib/queue/n8n-webhook-worker";
import { dispatchN8nEvent, NormalizedN8nEvent } from "../lib/integrations/n8n/event-dispatcher";

describe("Milestone 11 — N8n Automation & Webhook Integration Engine", () => {
  beforeEach(() => {
    clearN8nStores();
    vi.restoreAllMocks();
  });

  // 1. URL & SSRF Validation & HTTPS Enforcement
  describe("Security: URL & SSRF Validation", () => {
    it("7. Validates valid HTTPS webhook URLs", () => {
      const result = validateWebhookUrl("https://n8n.example.com/webhook/test");
      expect(result.isValid).toBe(true);
    });

    it("8. Rejects local loopback IPv4 addresses (SSRF Protection)", () => {
      const envBackup = process.env.NODE_ENV;
      (process.env as Record<string, string>).NODE_ENV = "production";
      const result = validateWebhookUrl("https://127.0.0.1/webhook");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("SSRF");
      (process.env as Record<string, string>).NODE_ENV = envBackup;
    });

    it("8. Rejects private IPv4 ranges (10.x.x.x, 192.168.x.x)", () => {
      const envBackup = process.env.NODE_ENV;
      (process.env as Record<string, string>).NODE_ENV = "production";
      expect(validateWebhookUrl("https://10.0.0.1/webhook").isValid).toBe(false);
      expect(validateWebhookUrl("https://192.168.1.1/webhook").isValid).toBe(false);
      (process.env as Record<string, string>).NODE_ENV = envBackup;
    });

    it("9. Enforces HTTPS in production", () => {
      const envBackup = process.env.NODE_ENV;
      (process.env as Record<string, string>).NODE_ENV = "production";
      delete process.env.ALLOW_HTTP_WEBHOOKS;
      const result = validateWebhookUrl("http://n8n.example.com/webhook");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Production webhooks must use HTTPS");
      (process.env as Record<string, string>).NODE_ENV = envBackup;
    });
  });

  // 2. Encryption & Decryption
  describe("Security: Secret & URL Encryption at Rest", () => {
    it("26. Webhook URL & Secret are encrypted at rest and never exposed in cleartext", () => {
      const rawUrl = "https://n8n.example.com/webhook/secret-endpoint";
      const rawSecret = "super-secret-hmac-key";

      const encUrl = encryptWebhookUrl(rawUrl);
      const encSecret = encryptSigningSecret(rawSecret);

      expect(encUrl).not.toBe(rawUrl);
      expect(encSecret).not.toBe(rawSecret);

      expect(decryptWebhookUrl(encUrl)).toBe(rawUrl);
      expect(decryptSigningSecret(encSecret)).toBe(rawSecret);
    });
  });

  // 3. HMAC Signatures & Replay Protection
  describe("Security: HMAC Signing & Replay Protection", () => {
    it("10. Generates valid HMAC-SHA256 signature", () => {
      const secret = "my-secret-key";
      const timestamp = "2026-08-11T12:00:00.000Z";
      const payload = JSON.stringify({ event: "test" });

      const sig = generateWebhookSignature(secret, timestamp, payload);
      expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it("11. Verifies valid signature with timing-safe comparison", () => {
      const secret = "my-secret-key";
      const timestamp = "2026-08-11T12:00:00.000Z";
      const payload = JSON.stringify({ event: "test" });

      const sig = generateWebhookSignature(secret, timestamp, payload);
      const isValid = verifyWebhookSignature(secret, timestamp, payload, sig);
      expect(isValid).toBe(true);

      const isInvalid = verifyWebhookSignature(secret, timestamp, payload, "sha256=invalid1234567890123456789012345678901234567890123456789012345678901234");
      expect(isInvalid).toBe(false);
    });

    it("12. Rejects timestamps older than tolerance (Replay Protection)", () => {
      const now = new Date();
      const validTime = now.toISOString();
      const oldTime = new Date(now.getTime() - 600 * 1000).toISOString(); // 10 minutes ago

      expect(verifyTimestampTolerance(validTime, 300)).toBe(true);
      expect(verifyTimestampTolerance(oldTime, 300)).toBe(false);
    });
  });

  // 4. Webhook Provider & HTTP Mocking
  describe("N8nWebhookProvider Delivery Execution", () => {
    it("15. Handles successful delivery (HTTP 200)", async () => {
      const provider = new N8nWebhookProvider();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ message: "n8n workflow triggered" }),
      } as Response);

      const result = await provider.sendWebhook({
        rawWebhookUrl: "https://n8n.example.com/webhook/test",
        signingSecret: "secret",
        eventId: "evt-123",
        eventType: "review.approved",
        occurredAt: new Date().toISOString(),
        payload: { campaignId: "camp-1" },
      });

      expect(result.success).toBe(true);
      expect(result.classification).toBe("SUCCESS");
      expect(result.httpStatus).toBe(200);
      expect(result.responsePreview).toContain("n8n workflow triggered");
    });

    it("16. Classifies HTTP 429 as RATE_LIMIT and marks as retryable", async () => {
      const provider = new N8nWebhookProvider();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "Rate limit exceeded",
      } as Response);

      const result = await provider.sendWebhook({
        rawWebhookUrl: "https://n8n.example.com/webhook/test",
        signingSecret: "secret",
        eventId: "evt-123",
        eventType: "review.approved",
        occurredAt: new Date().toISOString(),
        payload: {},
      });

      expect(result.success).toBe(false);
      expect(result.classification).toBe("RATE_LIMIT");
      expect(result.isRetryable).toBe(true);
    });

    it("17. Classifies HTTP 500 as SERVER_ERROR and marks as retryable", async () => {
      const provider = new N8nWebhookProvider();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      } as Response);

      const result = await provider.sendWebhook({
        rawWebhookUrl: "https://n8n.example.com/webhook/test",
        signingSecret: "secret",
        eventId: "evt-123",
        eventType: "review.approved",
        occurredAt: new Date().toISOString(),
        payload: {},
      });

      expect(result.success).toBe(false);
      expect(result.classification).toBe("SERVER_ERROR");
      expect(result.isRetryable).toBe(true);
    });

    it("18. Classifies HTTP 400 as CLIENT_ERROR and marks as non-retryable", async () => {
      const provider = new N8nWebhookProvider();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      } as Response);

      const result = await provider.sendWebhook({
        rawWebhookUrl: "https://n8n.example.com/webhook/test",
        signingSecret: "secret",
        eventId: "evt-123",
        eventType: "review.approved",
        occurredAt: new Date().toISOString(),
        payload: {},
      });

      expect(result.success).toBe(false);
      expect(result.classification).toBe("CLIENT_ERROR");
      expect(result.isRetryable).toBe(false);
    });

    it("19. Handles network failures gracefully", async () => {
      const provider = new N8nWebhookProvider();
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Connection reset"));

      const result = await provider.sendWebhook({
        rawWebhookUrl: "https://n8n.example.com/webhook/test",
        signingSecret: "secret",
        eventId: "evt-123",
        eventType: "review.approved",
        occurredAt: new Date().toISOString(),
        payload: {},
      });

      expect(result.success).toBe(false);
      expect(result.classification).toBe("NETWORK");
      expect(result.isRetryable).toBe(true);
    });
  });

  // 5. Worker & State Operations
  describe("Queue Worker: Integration CRUD & Delivery Queueing", () => {
    it("4. Enforces workspace isolation for integrations", () => {
      createN8nIntegration({
        workspaceId: "ws-1",
        name: "WS1 Webhook",
        webhookUrl: "https://n8n.example.com/ws1",
      });

      createN8nIntegration({
        workspaceId: "ws-2",
        name: "WS2 Webhook",
        webhookUrl: "https://n8n.example.com/ws2",
      });

      const ws1List = getN8nIntegrations("ws-1");
      const ws2List = getN8nIntegrations("ws-2");

      expect(ws1List).toHaveLength(1);
      expect(ws1List[0].name).toBe("WS1 Webhook");
      expect(ws2List).toHaveLength(1);
      expect(ws2List[0].name).toBe("WS2 Webhook");
    });

    it("20. Prevents duplicate deliveries with idempotency key (integrationId:eventId)", async () => {
      const int = createN8nIntegration({
        workspaceId: "ws-1",
        name: "Test Webhook",
        webhookUrl: "https://n8n.example.com/webhook",
      });

      const customProvider = new N8nWebhookProvider();
      vi.spyOn(customProvider, "sendWebhook").mockResolvedValue({
        success: true,
        classification: "SUCCESS",
        isRetryable: false,
        httpStatus: 200,
        deliveredAt: new Date().toISOString(),
      });

      const deliv1 = await enqueueWebhookDelivery({
        workspaceId: "ws-1",
        integrationId: int.id,
        eventId: "evt-dup-1",
        eventType: "campaign.created",
        payload: { test: 1 },
        provider: customProvider,
      });

      const deliv2 = await enqueueWebhookDelivery({
        workspaceId: "ws-1",
        integrationId: int.id,
        eventId: "evt-dup-1",
        eventType: "campaign.created",
        payload: { test: 1 },
        provider: customProvider,
      });

      expect(deliv1.id).toBe(deliv2.id);
    });

    it("21. Manual retry reuses original eventId", async () => {
      const int = createN8nIntegration({
        workspaceId: "ws-1",
        name: "Retry Webhook",
        webhookUrl: "https://n8n.example.com/webhook",
      });

      const customProvider = new N8nWebhookProvider();
      vi.spyOn(customProvider, "sendWebhook").mockResolvedValueOnce({
        success: false,
        classification: "SERVER_ERROR",
        isRetryable: true,
        httpStatus: 500,
      }).mockResolvedValueOnce({
        success: true,
        classification: "SUCCESS",
        isRetryable: false,
        httpStatus: 200,
        deliveredAt: new Date().toISOString(),
      });

      const initial = await enqueueWebhookDelivery({
        workspaceId: "ws-1",
        integrationId: int.id,
        eventId: "evt-retry-100",
        eventType: "review.approved",
        payload: { campaignId: "camp-1" },
        provider: customProvider,
      });

      expect(initial.eventId).toBe("evt-retry-100");

      const retried = await retryWebhookDelivery(initial.id, "ws-1", customProvider);
      expect(retried?.eventId).toBe("evt-retry-100");
      expect(retried?.status).toBe("DELIVERED");
    });

    it("22. Cancels delivery if integration is disabled", async () => {
      const int = createN8nIntegration({
        workspaceId: "ws-1",
        name: "Disabled Webhook",
        webhookUrl: "https://n8n.example.com/webhook",
        isEnabled: false,
      });

      const deliv = await enqueueWebhookDelivery({
        workspaceId: "ws-1",
        integrationId: int.id,
        eventId: "evt-dis-1",
        eventType: "campaign.created",
        payload: {},
      });

      expect(deliv.status).toBe("CANCELLED");
    });

    it("25. Executes testIntegrationWebhook with integration.test event", async () => {
      const int = createN8nIntegration({
        workspaceId: "ws-1",
        name: "Test Hook",
        webhookUrl: "https://n8n.example.com/webhook",
      });

      const customProvider = new N8nWebhookProvider();
      vi.spyOn(customProvider, "sendWebhook").mockResolvedValue({
        success: true,
        classification: "SUCCESS",
        isRetryable: false,
        httpStatus: 200,
        deliveredAt: new Date().toISOString(),
      });

      const testDeliv = await testIntegrationWebhook(int.id, "ws-1", customProvider);
      expect(testDeliv.eventType).toBe("integration.test");
      expect(testDeliv.status).toBe("DELIVERED");
    });

    it("29. Broadcasts SSE delivery events", async () => {
      const eventsReceived: string[] = [];
      const unsubscribe = subscribeN8nEvents((evt) => {
        eventsReceived.push(evt.type);
      });

      const int = createN8nIntegration({
        workspaceId: "ws-1",
        name: "SSE Hook",
        webhookUrl: "https://n8n.example.com/webhook",
      });

      const customProvider = new N8nWebhookProvider();
      vi.spyOn(customProvider, "sendWebhook").mockResolvedValue({
        success: true,
        classification: "SUCCESS",
        isRetryable: false,
        httpStatus: 200,
        deliveredAt: new Date().toISOString(),
      });

      await enqueueWebhookDelivery({
        workspaceId: "ws-1",
        integrationId: int.id,
        eventId: "evt-sse-1",
        eventType: "review.approved",
        payload: {},
        provider: customProvider,
      });

      expect(eventsReceived).toContain("n8n.delivery.queued");
      expect(eventsReceived).toContain("n8n.delivery.processing");
      expect(eventsReceived).toContain("n8n.delivery.delivered");

      unsubscribe();
    });
  });

  // 6. Event Dispatcher & Filtering
  describe("Event Dispatcher & Filtering", () => {
    it("3. Respects integration event filters", async () => {
      createN8nIntegration({
        workspaceId: "ws-1",
        name: "Filtered Hook",
        webhookUrl: "https://n8n.example.com/filtered",
        eventFilters: ["review.approved", "instagram.published"],
      });

      const customProvider = new N8nWebhookProvider();
      vi.spyOn(customProvider, "sendWebhook").mockResolvedValue({
        success: true,
        classification: "SUCCESS",
        isRetryable: false,
        httpStatus: 200,
      });

      // 1. Dispatch subscribed event -> Should dispatch
      const res1 = await dispatchN8nEvent({
        eventType: "review.approved",
        workspaceId: "ws-1",
        data: { campaignId: "c1" },
        provider: customProvider,
      });
      expect(res1.dispatchedCount).toBe(1);

      // 2. Dispatch non-subscribed event -> Should be filtered out
      const res2 = await dispatchN8nEvent({
        eventType: "campaign.created",
        workspaceId: "ws-1",
        data: { campaignId: "c1" },
        provider: customProvider,
      });
      expect(res2.dispatchedCount).toBe(0);
    });

    it("28. Strips secrets and access tokens from event data payloads", async () => {
      createN8nIntegration({
        workspaceId: "ws-1",
        name: "Sanitized Hook",
        webhookUrl: "https://n8n.example.com/webhook",
        eventFilters: ["ALL"],
      });

      const customProvider = new N8nWebhookProvider();
      let sentPayload: NormalizedN8nEvent | null = null;
      vi.spyOn(customProvider, "sendWebhook").mockImplementation(async (params) => {
        sentPayload = params.payload as unknown as NormalizedN8nEvent;
        return {
          success: true,
          classification: "SUCCESS",
          isRetryable: false,
          httpStatus: 200,
        };
      });

      await dispatchN8nEvent({
        eventType: "instagram.published",
        workspaceId: "ws-1",
        data: {
          campaignId: "c1",
          assetId: "a1",
          metaAccessToken: "EAAB...", // Secret field
          openaiApiKey: "sk-proj-...", // Secret field
          dbPassword: "admin", // Secret field
        },
        provider: customProvider,
      });

      const payloadData = (sentPayload as NormalizedN8nEvent | null)?.data;
      expect(payloadData).toBeDefined();
      expect(payloadData?.campaignId).toBe("c1");
      expect(payloadData?.metaAccessToken).toBeUndefined();
      expect(payloadData?.openaiApiKey).toBeUndefined();
      expect(payloadData?.dbPassword).toBeUndefined();
    });
  });
});
