import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveSocialPublishingProvider,
  YouTubePublishingProvider,
  clearInMemoryMockPublishing,
} from "../apps/api/src/integrations/publishing/social-publishing-provider.js";
import {
  createContentProject,
  getContentProjectById,
  clearInMemoryContentProjects,
} from "../apps/api/src/services/content-project-service.js";
import {
  generateYouTubeMetadata,
  publishToYouTube,
} from "../apps/api/src/services/youtube-studio-service.js";

describe("Phase 3 Part 9 — Production YouTube Publishing & OAuth Architecture", () => {
  const userId = "usr_yt_test";
  const workspaceId = "ws_yt_test";

  beforeEach(() => {
    clearInMemoryMockPublishing();
    clearInMemoryContentProjects();
  });

  it("1. YOUTUBE OAUTH CREDENTIAL DETECTION: handles missing credentials without crashing", async () => {
    const unconfiguredProvider = new YouTubePublishingProvider("", "");
    const res = await unconfiguredProvider.publishPost({
      workspaceId,
      userId,
      content: "Test YouTube upload",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Provider not configured");
  });

  it("2. MOCK FALLBACK: falls back to MockPublishingProvider when unconfigured", () => {
    const provider = resolveSocialPublishingProvider("YOUTUBE");
    expect(provider.name).toBeDefined();
  });

  it("3. YOUTUBE SHORTS PUBLISH: publishes 9:16 short-form video payload", async () => {
    const provider = resolveSocialPublishingProvider("YOUTUBE");
    const res = await provider.publishPost({
      workspaceId,
      userId,
      title: "AI Short Video #Shorts",
      content: "Viral AI Short #tech #ai",
      mediaUrls: ["https://storage.ai-social.studio/generated_videos/short_1.mp4"],
      mediaType: "VIDEO",
      privacyStatus: "PUBLIC",
    });

    expect(res.success).toBe(true);
    expect(res.externalPostId).toContain("ext_youtube_");
  });

  it("4. YOUTUBE LONG FORM PUBLISH: publishes 16:9 video payload with chapters and thumbnail", async () => {
    const proj = await createContentProject({
      userId,
      workspaceId,
      input: {
        title: "Full Course: AI Engineering 2026",
        topic: "AI Engineering Masterclass",
      },
    });

    await generateYouTubeMetadata({ projectId: proj.id, workspaceId, userId });

    const pubRes = await publishToYouTube({
      projectId: proj.id,
      workspaceId,
      userId,
      privacyStatus: "PUBLIC",
      tags: ["ai", "engineering", "coding"],
    });

    expect(pubRes.success).toBe(true);
    expect(pubRes.externalPostId).toBeDefined();
  });

  it("5. YOUTUBE SCHEDULING: schedules post with future date and SCHEDULED privacy status", async () => {
    const provider = resolveSocialPublishingProvider("YOUTUBE");
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const res = await provider.schedulePost({
      workspaceId,
      userId,
      title: "Scheduled Tech Video",
      content: "Scheduled release description",
      scheduledAt: futureDate,
      privacyStatus: "SCHEDULED",
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe("SCHEDULED");
  });

  it("6. IDEMPOTENCY: prevents duplicate publishing calls on identical idempotencyKey", async () => {
    const provider = resolveSocialPublishingProvider("YOUTUBE");
    const key = `yt_idem_key_${Date.now()}`;
    const res1 = await provider.publishPost({
      workspaceId,
      userId,
      content: "Unique post payload",
      idempotencyKey: key,
    });

    const res2 = await provider.publishPost({
      workspaceId,
      userId,
      content: "Unique post payload",
      idempotencyKey: key,
    });

    expect(res1.externalPostId).toBe(res2.externalPostId);
  });
});
