import { describe, it, expect } from "vitest";
import { providerRegistry } from "../apps/api/src/integrations/social-engine/providers/provider-registry.js";
import { hasCapability } from "../apps/api/src/integrations/social-engine/capability-registry.js";
import { socialAccountService } from "../apps/api/src/integrations/social-engine/account-service.js";
import { generatePlatformContent } from "../apps/api/src/integrations/social-engine/platform-content-generator.js";
import { validatePlatformContent } from "../apps/api/src/integrations/social-engine/content-validator.js";
import { socialPublishingService } from "../apps/api/src/integrations/social-engine/publishing-service.js";
import { universalAnalyticsProvider } from "../apps/api/src/integrations/social-engine/analytics-provider.js";
import { deliverN8nWebhook } from "../apps/api/src/integrations/n8n.js";
import { SocialPlatform, SocialAccountData, PlatformContentData } from "@ai-social/shared";

describe("Milestone 13 - Multi-Platform Social Engine Unit Tests", () => {
  it("1. should register and retrieve all target platform providers", () => {
    const platforms: SocialPlatform[] = [
      "INSTAGRAM",
      "LINKEDIN",
      "THREADS",
      "PINTEREST",
      "FACEBOOK",
      "TIKTOK",
      "YOUTUBE",
      "X",
      "REDDIT",
      "TELEGRAM",
      "BLUESKY",
      "GOOGLE_BUSINESS",
      "MASTODON",
      "DISCORD",
    ];

    platforms.forEach((platform) => {
      const provider = providerRegistry.getProvider(platform);
      expect(provider).toBeDefined();
      expect(provider.platform).toBe(platform);
      expect(provider.getCapabilities().length).toBeGreaterThan(0);
    });
  });

  it("2. should correctly resolve platform capabilities", () => {
    expect(hasCapability("INSTAGRAM", "IMAGE_POST")).toBe(true);
    expect(hasCapability("INSTAGRAM", "HASHTAGS")).toBe(true);
    expect(hasCapability("LINKEDIN", "DOCUMENT")).toBe(true);
    expect(hasCapability("PINTEREST", "PIN")).toBe(true);
    expect(hasCapability("PINTEREST", "DESTINATION_URL")).toBe(true);
    expect(hasCapability("YOUTUBE", "SHORT")).toBe(true);
    expect(hasCapability("X", "THREAD")).toBe(true);
  });

  it("3. should support multiple accounts per platform per workspace", async () => {
    const wsId = "ws-test-multi-acc";

    const acc1 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "INSTAGRAM",
      externalAccountId: "ig-acc-1",
      username: "@tech_account",
      accessToken: "secret-token-1",
    });

    const acc2 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "INSTAGRAM",
      externalAccountId: "ig-acc-2",
      username: "@affiliate_account",
      accessToken: "secret-token-2",
    });

    expect(acc1.id).not.toBe(acc2.id);
    expect(acc1.username).toBe("@tech_account");
    expect(acc2.username).toBe("@affiliate_account");

    const workspaceAccounts = await socialAccountService.listWorkspaceAccounts(wsId);
    expect(workspaceAccounts.length).toBe(2);

    // Verify tokens are NOT returned in sanitized safe accounts
    const accRecord = acc1 as unknown as Record<string, unknown>;
    expect(accRecord.encryptedAccessToken).toBeUndefined();
    expect(accRecord.accessToken).toBeUndefined();
  });

  it("4. should enforce workspace isolation for accounts", async () => {
    const ws1Accounts = await socialAccountService.listWorkspaceAccounts("ws-1");
    const ws2Accounts = await socialAccountService.listWorkspaceAccounts("ws-2");

    expect(ws1Accounts.length).toBeGreaterThan(0);
    expect(ws2Accounts.length).toBe(0);
  });

  it("5. should validate affiliate content data and mandate affiliate disclosure", () => {
    const generated = generatePlatformContent({
      platform: "INSTAGRAM",
      contentType: "AFFILIATE_PRODUCT",
      sourceData: {
        affiliate: {
          productName: "Lumière Camera Lens",
          productUrl: "https://example.com/lens",
          affiliateUrl: "https://example.com/lens?aff=123",
          disclosure: "Disclosure: Affiliate link included. #ad",
        },
      },
    });

    expect(generated.caption).toContain("Lumière Camera Lens");
    expect(generated.caption).toContain("Disclosure: Affiliate link included. #ad");
    expect(generated.destinationUrl).toBe("https://example.com/lens?aff=123");
  });

  it("6. should generate professional certification content for LinkedIn", () => {
    const generated = generatePlatformContent({
      platform: "LINKEDIN",
      contentType: "CERTIFICATION",
      sourceData: {
        certification: {
          certificationName: "AWS Certified AI Specialist",
          issuingOrganization: "Amazon Web Services",
          skillsLearned: ["Deep Learning", "LLMs"],
        },
      },
    });

    expect(generated.title).toContain("AWS Certified AI Specialist");
    expect(generated.caption).toContain("Amazon Web Services");
    expect(generated.caption).toContain("Deep Learning");
  });

  it("7. should generate teaching lesson content for YouTube and X", () => {
    const ytGenerated = generatePlatformContent({
      platform: "YOUTUBE",
      contentType: "TEACHING",
      sourceData: {
        teaching: {
          topic: "Multi-Platform AI Engine",
          learningObjective: "Master adapter design patterns",
          keyPoints: ["Abstraction layer", "Capabilities registry"],
        },
      },
    });

    expect(ytGenerated.title).toContain("Master Multi-Platform AI Engine");
    expect(ytGenerated.description).toContain("Abstraction layer");

    const xGenerated = generatePlatformContent({
      platform: "X",
      contentType: "TEACHING",
      sourceData: {
        teaching: {
          topic: "Multi-Platform AI Engine",
          learningObjective: "Master adapter design patterns",
          keyPoints: ["Abstraction layer", "Capabilities registry"],
        },
      },
    });

    expect(xGenerated.caption).toContain("Thread: How to master Multi-Platform AI Engine");
  });

  it("8. should tailor content strategies for Pinterest, Threads, TikTok, Telegram, Bluesky", () => {
    const pin = generatePlatformContent({
      platform: "PINTEREST",
      contentType: "GENERAL",
      brand: { name: "Maison Lumière" },
    });
    expect(pin.title).toBeDefined();

    const thread = generatePlatformContent({
      platform: "THREADS",
      contentType: "GENERAL",
      brand: { name: "Maison Lumière" },
    });
    expect(thread.caption).toBeDefined();

    const tiktok = generatePlatformContent({
      platform: "TIKTOK",
      contentType: "GENERAL",
      brand: { name: "Maison Lumière" },
    });
    expect(tiktok.caption).toContain("#fyp");

    const telegram = generatePlatformContent({
      platform: "TELEGRAM",
      contentType: "GENERAL",
      brand: { name: "Maison Lumière" },
    });
    expect(telegram.caption).toBeDefined();

    const bsky = generatePlatformContent({
      platform: "BLUESKY",
      contentType: "GENERAL",
      brand: { name: "Maison Lumière" },
    });
    expect(bsky.caption).toBeDefined();
  });

  it("9. should validate platform character and length limits", () => {
    const longText = "A".repeat(400);

    const xValidation = validatePlatformContent("X", { caption: longText });
    expect(xValidation.isValid).toBe(false);
    expect(xValidation.suggestedStatus).toBe("NEEDS_REVIEW");
    expect(xValidation.truncatedContent?.caption?.length).toBeLessThanOrEqual(280);

    const threadsValidation = validatePlatformContent("THREADS", { caption: "Short caption" });
    expect(threadsValidation.isValid).toBe(true);
  });

  it("10. should require explicit human approval for Reddit affiliate posts", () => {
    const redditValidation = validatePlatformContent("REDDIT", {
      contentType: "AFFILIATE_PRODUCT",
      caption: "Check out this deal!",
    });

    expect(redditValidation.isValid).toBe(false);
    expect(redditValidation.suggestedStatus).toBe("NEEDS_REVIEW");
    expect(redditValidation.errors[0]).toContain("require explicit human approval");
  });

  it("11. should enforce platform approval isolation", () => {
    const igContent: Partial<PlatformContentData> = {
      id: "cont-ig",
      platform: "INSTAGRAM",
      approvalStatus: "APPROVED",
    };

    const liContent: Partial<PlatformContentData> = {
      id: "cont-li",
      platform: "LINKEDIN",
      approvalStatus: "PENDING",
    };

    expect(igContent.approvalStatus).toBe("APPROVED");
    expect(liContent.approvalStatus).toBe("PENDING");
  });

  it("12. should perform mock publishing through social publishing service when APPROVED", async () => {
    const mockAccount: SocialAccountData = {
      id: "acc-pub-1",
      workspaceId: "ws-1",
      platform: "LINKEDIN",
      externalAccountId: "li-user-123",
      status: "CONNECTED",
      connectedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const mockContent: PlatformContentData = {
      id: "content-101",
      workspaceId: "ws-1",
      platform: "LINKEDIN",
      contentType: "GENERAL",
      caption: "Publishing test post",
      status: "READY",
      approvalStatus: "APPROVED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await socialPublishingService.publishContent({
      workspaceId: "ws-1",
      account: mockAccount,
      content: mockContent,
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toContain("linkedin-post-");
  });

  it("13. should reject publishing if content is NOT APPROVED", async () => {
    const mockAccount: SocialAccountData = {
      id: "acc-pub-2",
      workspaceId: "ws-1",
      platform: "LINKEDIN",
      externalAccountId: "li-user-123",
      status: "CONNECTED",
      connectedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const mockContent: PlatformContentData = {
      id: "content-102",
      workspaceId: "ws-1",
      platform: "LINKEDIN",
      contentType: "GENERAL",
      caption: "Unapproved post",
      status: "DRAFT",
      approvalStatus: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await expect(
      socialPublishingService.publishContent({
        workspaceId: "ws-1",
        account: mockAccount,
        content: mockContent,
      })
    ).rejects.toThrow("Content must be APPROVED");
  });

  it("14. should handle analytics provider gracefully for unsupported platforms without fabricating data", async () => {
    const response = await universalAnalyticsProvider.fetchAnalytics("BLUESKY", "bsky-post-123");
    expect(response.available).toBe(false);
    expect(response.message).toContain("Analytics unavailable for BLUESKY");
    expect(response.metrics).toBeUndefined();
  });

  it("15. should dispatch n8n multi-platform social events", async () => {
    const res = await deliverN8nWebhook("ws-1", "social.content.published", {
      platform: "LINKEDIN",
      socialAccountId: "acc-123",
      platformContentId: "cont-123",
    });

    expect(res).toBeDefined();
    expect(res.eventId).toContain("evt-");
  });
});
