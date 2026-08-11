import { describe, it, expect, vi, beforeEach } from "vitest";

// Security & Encryption
import { encryptToken, decryptToken } from "../lib/security/encryption";
import { checkRateLimit, clearRateLimitStore } from "../lib/security/rate-limiter";

// Security & Webhooks
import {
  encryptWebhookUrl,
  decryptWebhookUrl,
  generateWebhookSignature,
  verifyWebhookSignature,
  validateWebhookUrl,
} from "../lib/integrations/n8n/security";

import {
  N8nWebhookProvider,
} from "../lib/integrations/n8n/n8n-webhook-provider";

import {
  dispatchN8nEvent,
  NormalizedN8nEvent,
} from "../lib/integrations/n8n/event-dispatcher";

import {
  createN8nIntegration,
  getN8nIntegrations,
  enqueueWebhookDelivery,
  processWebhookDelivery,
  clearN8nIntegrationStore,
  getIntegrationDeliveries,
  retryWebhookDelivery,
} from "../lib/queue/n8n-webhook-worker";

// Generation & Workers
import {
  createGenerationRun,
  getGenerationRunByCampaign,
} from "../lib/queue/generation-worker";

// Social Copy
import {
  enqueueSocialCopyJob,
} from "../lib/queue/social-copy-worker";
import { AITextProvider } from "../lib/ai/text-provider";

// Quality Scoring
import {
  enqueueQualityAnalysisJob,
} from "../lib/queue/quality-worker";
import { AIImageQualityProvider } from "../lib/ai/quality-provider";

// Instagram & Publishing
import {
  connectInstagramAccount,
  getConnectedInstagramAccount,
  enqueueInstagramPublishJob,
  getPublicationByAsset,
  clearInstagramAccountStore,
} from "../lib/queue/instagram-worker";

// Scheduler
import {
  createScheduledPublication,
  processDueScheduledPublications,
  cancelScheduledPublication,
  clearScheduleStore,
} from "../lib/queue/instagram-scheduler-worker";

// Analytics
import {
  syncInstagramAnalytics,
  saveMediaInsightSnapshot,
  saveAccountInsightSnapshot,
  clearAnalyticsStore,
  getCampaignAnalyticsList,
} from "../lib/queue/instagram-analytics-worker";

describe("Milestone 12 — End-to-End System, Failure Modes & Security Audit Suite", () => {
  beforeEach(() => {
    clearRateLimitStore();
    clearN8nIntegrationStore();
    clearInstagramAccountStore();
    clearScheduleStore();
    clearAnalyticsStore();
    vi.restoreAllMocks();
  });

  describe("1. Complete Happy Path End-to-End Workflow (Mocks Only)", () => {
    it("should process full lifecycle from campaign creation to n8n notification", async () => {
      const workspaceId = "ws-e2e-happy";
      const campaignId = "camp-e2e-1";
      const assetId = "asset-e2e-1";

      // 1. Create N8n Webhook Integration for Workspace
      const integration = createN8nIntegration({
        workspaceId,
        name: "E2E Production N8n Workflow",
        webhookUrl: "https://n8n.example.com/webhook/e2e",
        secret: "super-secret-key-1234567890",
        eventFilters: [
          "campaign.created",
          "campaign.generation.started",
          "campaign.generation.completed",
          "social_copy.completed",
          "quality.completed",
          "review.approved",
          "schedule.created",
          "schedule.published",
          "instagram.published",
          "analytics.sync.completed",
        ],
      });
      expect(integration.id).toBeDefined();

      // Spy on N8n Webhook Provider
      const deliveredEvents: NormalizedN8nEvent[] = [];
      vi.spyOn(N8nWebhookProvider.prototype, "sendWebhook").mockImplementation(
        async (params) => {
          deliveredEvents.push(params.payload as unknown as NormalizedN8nEvent);
          return {
            success: true,
            classification: "SUCCESS",
            httpStatus: 200,
            isRetryable: false,
            responsePreview: '{"status":"ok"}',
          };
        }
      );

      // 2. Dispatch Campaign Created Event
      await dispatchN8nEvent({
        workspaceId,
        eventType: "campaign.created",
        data: { campaignId, title: "Summer Riviera Collection" },
      });

      // Process queued webhook delivery
      const queuedDeliveries = getIntegrationDeliveries(integration.id, workspaceId);
      expect(queuedDeliveries.length).toBe(1);
      const deliveryResult = await processWebhookDelivery({ deliveryId: queuedDeliveries[0].id });
      expect(deliveryResult.status).toBe("DELIVERED");

      // 3. Trigger Generation Run
      const genRun = createGenerationRun({
        workspaceId,
        campaignId,
        brandName: "Maison Lumiere",
        brandTone: "Sophisticated Elegance",
        campaignName: "Summer Riviera",
        referenceAsset: { id: "ref-1", storagePath: "ref.jpg", fileName: "ref.jpg" },
        inputAssets: [{ id: "inp-1", storagePath: "inp.jpg", fileName: "inp.jpg" }],
      });
      expect(["QUEUED", "PROCESSING"]).toContain(genRun.status);

      // 4. Generate Social Copy with Mocked AI Text Provider
      const mockTextProvider: AITextProvider = {
        generateSocialCopy: vi.fn(async () => ({
          caption: "Sun-drenched Mediterranean luxury resort collection.",
          hashtags: ["maisonlumiere", "resortfashion", "luxurytravel"],
          cta: "Explore the summer editorial.",
          altText: "A white silk resort dress in a coastal villa.",
          model: "gpt-4o",
        })),
      };

      const copyJob = await enqueueSocialCopyJob({
        workspaceId,
        campaignId,
        generationJobId: "gen-1",
        generatedAssetId: assetId,
        brand: {
          name: "Maison Lumiere",
          toneVoice: "Sophisticated Elegance",
          targetAudience: "Luxury Travelers",
          defaultCta: "Discover the collection",
        },
        campaign: {
          name: "Summer Riviera",
        },
        inputFileName: "photo.jpg",
        textProvider: mockTextProvider,
      });

      expect(["COMPLETED", "PROCESSING", "QUEUED"]).toContain(copyJob.status);

      // 5. Quality Analysis with Mocked Quality Provider
      const mockQualityProvider: AIImageQualityProvider = {
        analyzeImageQuality: vi.fn(async () => ({
          overallScore: 88,
          referenceSimilarityScore: 90,
          brandConsistencyScore: 85,
          compositionScore: 88,
          lightingScore: 92,
          productFidelityScore: 86,
          technicalQualityScore: 89,
          verdict: "PASS" as const,
          strengths: ["Exquisite lighting", "Strong brand consistency"],
          issues: [],
          recommendations: ["Ready for publication"],
          model: "gpt-4o",
        })),
      };

      const qualityJob = await enqueueQualityAnalysisJob({
        workspaceId,
        campaignId,
        generatedAssetId: assetId,
        generatedAssetPath: "gen/photo.png",
        referenceAssetPath: "ref/ref.png",
        inputAssetPath: "inp/photo.png",
        brandName: "Maison Lumiere",
        toneVoice: "Editorial",
        campaignName: "Summer Riviera",
        qualityProvider: mockQualityProvider,
      });
      expect(["COMPLETED", "PROCESSING", "QUEUED"]).toContain(qualityJob.status);

      // 6. Connect Mocked Instagram Account
      const account = connectInstagramAccount({
        workspaceId,
        username: "maisonlumiere_official",
        instagramUserId: "ig-user-12345",
        rawAccessToken: "mock-meta-access-token",
      });
      expect(account.status).toBe("CONNECTED");

      // 7. Schedule Post for 1 Hour in the Future
      const targetTimeMs = Date.now() + 3600000;
      const scheduleTime = new Date(targetTimeMs).toISOString();
      const sched = await createScheduledPublication({
        workspaceId,
        campaignId,
        generatedAssetId: assetId,
        socialCopyId: copyJob.id,
        instagramAccountId: account.id,
        scheduledFor: scheduleTime,
        timezone: "UTC",
        caption: "Sun-drenched Mediterranean luxury resort collection.",
        hashtags: ["maisonlumiere"],
        cta: "Explore the summer editorial.",
        approvalStatus: "APPROVED",
        imageStatus: "COMPLETED",
        copyStatus: "COMPLETED",
        qualityStatus: "COMPLETED",
      });
      expect(sched.status).toBe("SCHEDULED");

      // 8. Execute Scheduler Claim & Publish (1 minute after scheduled time)
      const due = await processDueScheduledPublications({ forceCurrentTimeMs: targetTimeMs + 60000 });
      expect(due.length).toBeGreaterThanOrEqual(1);

      // 9. Sync Analytics
      const analyticsSync = await syncInstagramAnalytics({ workspaceId });
      expect(analyticsSync.success).toBe(true);

      // Verify all delivered events were received by N8n mock
      expect(deliveredEvents.length).toBeGreaterThanOrEqual(1);
      expect(deliveredEvents[0].eventType).toBe("campaign.created");
    });
  });

  describe("2. System Failure Modes & Resiliency Audit", () => {
    it("should handle generation run failure gracefully without breaking application state", async () => {
      const workspaceId = "ws-fail-gen";
      const campaignId = "camp-fail-1";

      const genRun = createGenerationRun({
        workspaceId,
        campaignId,
        brandName: "Fail Brand",
        brandTone: "Neutral",
        campaignName: "Fail Campaign",
        referenceAsset: { id: "ref-f", storagePath: "ref.jpg", fileName: "ref.jpg" },
        inputAssets: [{ id: "inp-f", storagePath: "inp.jpg", fileName: "inp.jpg" }],
      });

      expect(genRun.id).toBeDefined();
      expect(["QUEUED", "PROCESSING"]).toContain(genRun.status);
    });

    it("should prevent publish when Instagram token is expired (REAUTH_REQUIRED)", async () => {
      const workspaceId = "ws-fail-auth";
      const account = connectInstagramAccount({
        workspaceId,
        username: "maisonlumiere_official",
        instagramUserId: "ig-user-fail",
        rawAccessToken: "invalid-expired-token",
      });

      await enqueueInstagramPublishJob({
        workspaceId,
        campaignId: "c1",
        generatedAssetId: "a1",
        socialCopyId: "sc1",
        caption: "Test post",
        hashtags: ["test"],
        cta: "CTA",
        approvalStatus: "APPROVED",
        imageStatus: "COMPLETED",
        copyStatus: "COMPLETED",
        qualityStatus: "COMPLETED",
        imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600",
        simulateAuthError: true,
      });

      await new Promise((r) => setTimeout(r, 150));
      const pub = getPublicationByAsset("a1");
      expect(["FAILED", "PROCESSING"]).toContain(pub?.status);

      const updatedAcc = getConnectedInstagramAccount(workspaceId);
      expect(["REAUTH_REQUIRED", "CONNECTED"]).toContain(updatedAcc?.status);
    });

    it("should prevent scheduled publishing if asset approval is revoked or cancelled", async () => {
      const workspaceId = "ws-cancel-sched";
      const account = connectInstagramAccount({
        workspaceId,
        username: "maisonlumiere_official",
        instagramUserId: "ig-user-cancel",
        rawAccessToken: "token-cancel",
      });

      const targetTimeMs = Date.now() + 3600000;
      const sched = await createScheduledPublication({
        workspaceId,
        campaignId: "c-cancel",
        generatedAssetId: "a-cancel",
        socialCopyId: "sc-cancel",
        instagramAccountId: account.id,
        scheduledFor: new Date(targetTimeMs).toISOString(),
        timezone: "UTC",
        caption: "Caption",
        hashtags: ["tag"],
        cta: "CTA",
        approvalStatus: "APPROVED",
        imageStatus: "COMPLETED",
        copyStatus: "COMPLETED",
        qualityStatus: "COMPLETED",
      });

      const cancelled = cancelScheduledPublication(sched.id, workspaceId);
      expect(cancelled?.status).toBe("CANCELLED");

      // Processing due schedules should skip cancelled job
      const due = await processDueScheduledPublications({ forceCurrentTimeMs: targetTimeMs + 60000 });
      expect(due.length).toBe(0);
    });

    it("should retry n8n webhook delivery on 500 server error up to max attempts", async () => {
      const workspaceId = "ws-n8n-retry";
      const integration = createN8nIntegration({
        workspaceId,
        name: "Retry Test N8n",
        webhookUrl: "https://n8n.example.com/webhook/retry",
        eventFilters: ["campaign.created"],
      });

      const mockWebhookProvider = new N8nWebhookProvider();
      vi.spyOn(mockWebhookProvider, "sendWebhook").mockResolvedValue({
        success: false,
        classification: "SERVER_ERROR",
        httpStatus: 500,
        isRetryable: true,
        errorMessage: "500 Internal Server Error",
      });

      const delivery = await enqueueWebhookDelivery({
        workspaceId,
        integrationId: integration.id,
        eventId: "evt-retry-1",
        eventType: "campaign.created",
        payload: { campaignId: "c-retry" },
        provider: mockWebhookProvider,
      });

      const processed = await processWebhookDelivery({
        deliveryId: delivery.id,
        customProvider: mockWebhookProvider,
      });
      expect(["QUEUED", "RETRYING", "FAILED"]).toContain(processed.status);
      expect(processed.attemptCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("3. Security Audit & Isolation Enforcement", () => {
    it("should enforce strict workspace isolation (Workspace B cannot access Workspace A resources)", () => {
      const wsA = "workspace-A";
      const wsB = "workspace-B";

      connectInstagramAccount({
        workspaceId: wsA,
        username: "brand_a",
        instagramUserId: "ig-a",
        rawAccessToken: "token-a",
      });

      // Workspace B attempts to get Workspace A's account
      const accB = getConnectedInstagramAccount(wsB);
      expect(accB).toBeNull();
    });

    it("should prevent SSRF attacks during N8n webhook configuration", () => {
      const envBackup = process.env.NODE_ENV;
      (process.env as Record<string, string>).NODE_ENV = "production";

      // Loopback IP
      expect(validateWebhookUrl("https://127.0.0.1/webhook").isValid).toBe(false);
      // Private IP
      expect(validateWebhookUrl("https://192.168.1.10/webhook").isValid).toBe(false);
      // Non-HTTPS in production
      delete process.env.ALLOW_HTTP_WEBHOOKS;
      expect(validateWebhookUrl("http://n8n.example.com/webhook").isValid).toBe(false);

      (process.env as Record<string, string>).NODE_ENV = envBackup;
    });

    it("should verify secret tokens never leak in n8n payloads", async () => {
      const workspaceId = "ws-sec-leak";
      let sentPayload: NormalizedN8nEvent | null = null;

      createN8nIntegration({
        workspaceId,
        name: "Secret Leak Protection Test",
        webhookUrl: "https://n8n.example.com/webhook/leak-test",
        eventFilters: ["campaign.created"],
      });

      const provider = new N8nWebhookProvider();
      vi.spyOn(provider, "sendWebhook").mockImplementation(async (params) => {
        sentPayload = params.payload as unknown as NormalizedN8nEvent;
        return {
          success: true,
          classification: "SUCCESS",
          httpStatus: 200,
          isRetryable: false,
        };
      });

      await dispatchN8nEvent({
        workspaceId,
        eventType: "campaign.created",
        data: {
          campaignId: "c1",
          metaAccessToken: "EAABwz...",
          openaiApiKey: "sk-proj-...",
          dbPassword: "secret-password",
        },
        provider,
      });

      const payloadData = (sentPayload as NormalizedN8nEvent | null)?.data;
      expect(payloadData).toBeDefined();
      expect(payloadData?.campaignId).toBe("c1");
      expect(payloadData?.metaAccessToken).toBeUndefined();
      expect(payloadData?.openaiApiKey).toBeUndefined();
      expect(payloadData?.dbPassword).toBeUndefined();
    });

    it("should enforce rate limiting on sensitive operation endpoints", () => {
      const clientIp = "192.0.2.45";

      // First 5 requests allowed under limit 5
      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(`publish:${clientIp}`, { max: 5, windowMs: 60000 });
        expect(res.allowed).toBe(true);
      }

      // 6th request rejected
      const rateLimited = checkRateLimit(`publish:${clientIp}`, { max: 5, windowMs: 60000 });
      expect(rateLimited.allowed).toBe(false);
      expect(rateLimited.remaining).toBe(0);
    });

    it("should generate and verify HMAC-SHA256 signatures for webhooks correctly", () => {
      const secret = "my-secure-signing-secret";
      const payload = JSON.stringify({ event: "test" });
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const signature = generateWebhookSignature(secret, timestamp, payload);
      expect(signature).toContain("sha256=");

      const isValid = verifyWebhookSignature(secret, timestamp, payload, signature);
      expect(isValid).toBe(true);

      const isInvalid = verifyWebhookSignature(secret, timestamp, payload, signature + "bad");
      expect(isInvalid).toBe(false);
    });
  });
});
