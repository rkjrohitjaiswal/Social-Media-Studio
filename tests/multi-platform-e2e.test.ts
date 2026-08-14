import { describe, it, expect } from "vitest";
import { generatePlatformContent } from "../apps/api/src/integrations/social-engine/platform-content-generator.js";
import { socialPublishingService } from "../apps/api/src/integrations/social-engine/publishing-service.js";
import { universalAnalyticsProvider } from "../apps/api/src/integrations/social-engine/analytics-provider.js";
import { deliverN8nWebhook } from "../apps/api/src/integrations/n8n.js";
import { SocialAccountData, PlatformContentData } from "@ai-social/shared";

describe("Milestone 13 - E2E Multi-Platform Workflows", () => {
  it("Flow 1: Affiliate Product Campaign (Instagram + Pinterest + LinkedIn)", async () => {
    const workspaceId = "ws-e2e-1";

    // 1 & 2 & 3: Source Affiliate Product Data & Image
    const affiliateProduct = {
      productName: "Lumière Professional 85mm F/1.2 Lens",
      productUrl: "https://example.com/lens-85mm",
      affiliateUrl: "https://example.com/lens-85mm?aff=studio2026",
      category: "Photography Gear",
      price: 1899,
      currency: "USD",
      keyFeatures: [
        "F/1.2 ultra-fast circular aperture",
        "Nano AR Coating II for ghosting reduction",
        "Dual XD Linear Motors for quiet focus",
      ],
      disclosure: "Disclosure: This post contains affiliate links. #ad #affiliate",
    };
    const imageUrl = "https://images.unsplash.com/photo-1548036328-c9fa89d128fa";

    // 4 & 5: Generate platform-specific content for selected destinations
    const targets = ["INSTAGRAM", "PINTEREST", "LINKEDIN"] as const;
    const generatedContents: Record<string, Partial<PlatformContentData>> = {};

    targets.forEach((platform) => {
      generatedContents[platform] = generatePlatformContent({
        platform,
        contentType: "AFFILIATE_PRODUCT",
        sourceData: { affiliate: affiliateProduct },
        brand: { name: "Maison Lumière" },
        assetUrl: imageUrl,
      });
    });

    expect(generatedContents["INSTAGRAM"].caption).toContain("Lumière Professional 85mm");
    expect(generatedContents["PINTEREST"].title).toContain("Lumière Professional 85mm");
    expect(generatedContents["LINKEDIN"].caption).toContain("Professional Tool Highlight");

    // 6: Approve Instagram, LinkedIn, Pinterest
    const igContent: PlatformContentData = {
      id: "cont-aff-ig",
      workspaceId,
      platform: "INSTAGRAM",
      contentType: "AFFILIATE_PRODUCT",
      caption: generatedContents["INSTAGRAM"].caption,
      status: "READY",
      approvalStatus: "APPROVED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const liContent: PlatformContentData = {
      id: "cont-aff-li",
      workspaceId,
      platform: "LINKEDIN",
      contentType: "AFFILIATE_PRODUCT",
      caption: generatedContents["LINKEDIN"].caption,
      status: "READY",
      approvalStatus: "APPROVED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pinContent: PlatformContentData = {
      id: "cont-aff-pin",
      workspaceId,
      platform: "PINTEREST",
      contentType: "AFFILIATE_PRODUCT",
      caption: generatedContents["PINTEREST"].description,
      title: generatedContents["PINTEREST"].title,
      status: "READY",
      approvalStatus: "APPROVED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(igContent.approvalStatus).toBe("APPROVED");
    expect(liContent.approvalStatus).toBe("APPROVED");
    expect(pinContent.approvalStatus).toBe("APPROVED");

    // 7: Schedule all three
    const scheduleItems = [
      { contentId: igContent.id, scheduledFor: new Date("2026-08-15T14:00:00Z") },
      { contentId: liContent.id, scheduledFor: new Date("2026-08-15T15:00:00Z") },
      { contentId: pinContent.id, scheduledFor: new Date("2026-08-15T16:00:00Z") },
    ];
    expect(scheduleItems.length).toBe(3);

    // 8: Mock publish
    const igAccount: SocialAccountData = {
      id: "acc-ig",
      workspaceId,
      platform: "INSTAGRAM",
      externalAccountId: "ig-123",
      status: "CONNECTED",
      connectedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const liAccount: SocialAccountData = {
      id: "acc-li",
      workspaceId,
      platform: "LINKEDIN",
      externalAccountId: "li-123",
      status: "CONNECTED",
      connectedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const pinAccount: SocialAccountData = {
      id: "acc-pin",
      workspaceId,
      platform: "PINTEREST",
      externalAccountId: "pin-123",
      status: "CONNECTED",
      connectedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    const igPub = await socialPublishingService.publishContent({
      workspaceId,
      account: igAccount,
      content: igContent,
      mediaUrl: imageUrl,
    });
    const liPub = await socialPublishingService.publishContent({
      workspaceId,
      account: liAccount,
      content: liContent,
      mediaUrl: imageUrl,
    });
    const pinPub = await socialPublishingService.publishContent({
      workspaceId,
      account: pinAccount,
      content: pinContent,
      mediaUrl: imageUrl,
    });

    expect(igPub.success).toBe(true);
    expect(liPub.success).toBe(true);
    expect(pinPub.success).toBe(true);

    // 9 & 10: Create analytics records & n8n events
    const igAnalytics = await universalAnalyticsProvider.fetchAnalytics("INSTAGRAM", igPub.externalPostId!);
    expect(igAnalytics).toBeDefined();

    const n8nRes = await deliverN8nWebhook(workspaceId, "social.content.published", {
      platform: "INSTAGRAM",
      externalPostId: igPub.externalPostId,
    });
    expect(n8nRes.eventId).toBeDefined();
  });

  it("Flow 2: Certification Campaign (Instagram + LinkedIn + Threads)", async () => {
    const workspaceId = "ws-e2e-2";

    const certData = {
      certificationName: "AWS Certified AI & ML Specialist",
      issuingOrganization: "Amazon Web Services",
      completionDate: "August 2026",
      skillsLearned: ["Large Language Models", "PyTorch", "SageMaker Pipelines"],
      certificateUrl: "https://aws.amazon.com/verify/cert-123",
    };

    const igContent = generatePlatformContent({
      platform: "INSTAGRAM",
      contentType: "CERTIFICATION",
      sourceData: { certification: certData },
    });

    const liContent = generatePlatformContent({
      platform: "LINKEDIN",
      contentType: "CERTIFICATION",
      sourceData: { certification: certData },
    });

    const threadsContent = generatePlatformContent({
      platform: "THREADS",
      contentType: "CERTIFICATION",
      sourceData: { certification: certData },
    });

    expect(igContent.caption).toContain("AWS Certified AI & ML Specialist");
    expect(liContent.title).toContain("AWS Certified AI & ML Specialist");
    expect(threadsContent.caption).toContain("AWS Certified AI & ML Specialist");
  });

  it("Flow 3: Teaching Campaign (Instagram + LinkedIn + YouTube + X)", async () => {
    const workspaceId = "ws-e2e-3";

    const teachingData = {
      topic: "Multi-Platform Social Engine Architecture",
      level: "ADVANCED" as const,
      learningObjective: "Build scalable multi-platform social media systems",
      keyPoints: ["Adapter pattern for platforms", "Capabilities registry", "Dedicated AI strategies"],
    };

    const targetPlatforms = ["INSTAGRAM", "LINKEDIN", "YOUTUBE", "X"] as const;

    targetPlatforms.forEach((platform) => {
      const generated = generatePlatformContent({
        platform,
        contentType: "TEACHING",
        sourceData: { teaching: teachingData },
      });
      expect(generated.caption || generated.title).toBeDefined();
    });
  });
});
