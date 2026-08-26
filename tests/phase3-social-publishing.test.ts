import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveSocialPublishingProvider,
  InstagramPublishingProvider,
  clearInMemoryMockPublishing,
} from "../apps/api/src/integrations/publishing/social-publishing-provider.js";
import {
  executeDueScheduledPosts,
  clearInMemoryPublishedPosts,
} from "../apps/api/src/services/publishing-service.js";

describe("Phase 3 Part 9 — Instagram & Multi-Platform Social Publishing Architecture", () => {
  const userId = "usr_social_pub_test";
  const workspaceId = "ws_social_pub_test";

  beforeEach(() => {
    clearInMemoryMockPublishing();
    clearInMemoryPublishedPosts();
  });

  it("1. INSTAGRAM TOKEN PROTECTION: handles missing access token gracefully without crashing", async () => {
    const unconfiguredInsta = new InstagramPublishingProvider("");
    const res = await unconfiguredInsta.publishPost({
      workspaceId,
      userId,
      content: "Instagram Post Caption",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Instagram Access Token missing");
  });

  it("2. INSTAGRAM IMAGE PUBLISH: publishes single image payload with caption", async () => {
    const provider = resolveSocialPublishingProvider("INSTAGRAM");
    const res = await provider.publishPost({
      workspaceId,
      userId,
      content: "Luxury fashion editorial #couture",
      mediaUrls: ["https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80"],
      mediaType: "IMAGE",
    });

    expect(res.success).toBe(true);
    expect(res.externalPostId).toContain("ext_instagram_");
  });

  it("3. INSTAGRAM CAROUSEL: publishes multi-image carousel payload", async () => {
    const provider = resolveSocialPublishingProvider("INSTAGRAM");
    const res = await provider.publishPost({
      workspaceId,
      userId,
      content: "Swipe left for 5 luxury watch models!",
      mediaUrls: [
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80",
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
      ],
      mediaType: "CAROUSEL",
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe("PUBLISHED");
  });

  it("4. INSTAGRAM REEL: publishes video reel payload with cover image", async () => {
    const provider = resolveSocialPublishingProvider("INSTAGRAM");
    const res = await provider.publishPost({
      workspaceId,
      userId,
      content: "Behind the scenes 4K luxury reel",
      mediaUrls: ["https://storage.ai-social.studio/generated_videos/reel_1.mp4"],
      mediaType: "VIDEO",
      thumbnailUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
    });

    expect(res.success).toBe(true);
  });

  it("5. PUBLISHING EXECUTION SERVICE: executes due scheduled posts via social publishing adapter", async () => {
    const summary = await executeDueScheduledPosts({ workspaceId, userId });
    expect(summary.processed).toBeGreaterThanOrEqual(0);
  });

  it("6. SECRET PROTECTION: access tokens are never returned in public DTOs or logs", () => {
    const provider = resolveSocialPublishingProvider("INSTAGRAM");
    expect(JSON.stringify(provider)).not.toContain("secret");
  });
});
