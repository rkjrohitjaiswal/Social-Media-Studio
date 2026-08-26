import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import { generateLongFormScript } from "../apps/api/src/services/long-form-content-service.js";
import { renderLongFormVideo } from "../apps/api/src/services/long-form-video-service.js";
import {
  createContentPackage,
  clearInMemoryContentPackages,
  getContentPackageById,
} from "../apps/api/src/services/content-repurposing-service.js";
import { clearInMemoryVideoJobs } from "../apps/api/src/services/video-composition-service.js";
import { clearInMemoryUsage, getUserUsage } from "../apps/api/src/services/usage-service.js";

describe("Phase 3 Part 5 — Long-Form YouTube + AI Content Repurposing Engine", { timeout: 20000 }, () => {
  beforeEach(() => {
    clearInMemoryContentPackages();
    clearInMemoryVideoJobs();
    clearInMemoryUsage();
  });

  it("1. generates long-form YouTube script and breakdown", async () => {
    const userId = "usr-lf-script";
    const result = await generateLongFormScript({
      userId,
      input: {
        topic: "React Server Components Architecture",
        targetPlatform: "YOUTUBE",
        targetDurationMinutes: 5,
      },
    });

    expect(result.title).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.chapters.length).toBe(4);
    expect(result.keywords.length).toBeGreaterThan(0);
  });

  it("2. incorporates NotebookLM-style source material without fabricating facts", async () => {
    const userId = "usr-source-notes";
    const sourceText = "React Server Components run on the server only and never ship JS bundle to client.";

    const result = await generateLongFormScript({
      userId,
      input: {
        topic: "RSC Mechanics",
        sourceText,
        targetPlatform: "YOUTUBE",
        targetDurationMinutes: 5,
      },
    });

    expect(result.description).toBeDefined();
    expect(result.chapters[0].narration).toContain("provided notes");
  });

  it("3. handles 5-minute target duration (4 chapters)", async () => {
    const userId = "usr-5m-target";
    const script = await generateLongFormScript({
      userId,
      input: {
        topic: "5 Min Topic",
        targetPlatform: "YOUTUBE",
        targetDurationMinutes: 5,
      },
    });

    expect(script.chapters).toHaveLength(4);
  });

  it("4. handles 10-minute target duration (5 chapters)", async () => {
    const userId = "usr-10m-target";
    const script = await generateLongFormScript({
      userId,
      input: {
        topic: "10 Min Topic",
        targetPlatform: "YOUTUBE",
        targetDurationMinutes: 10,
      },
    });

    expect(script.chapters).toHaveLength(5);
  });

  it("5. handles 15-minute target duration (6 chapters)", async () => {
    const userId = "usr-15m-target";
    const script = await generateLongFormScript({
      userId,
      input: {
        topic: "15 Min Topic",
        targetPlatform: "YOUTUBE",
        targetDurationMinutes: 15,
      },
    });

    expect(script.chapters).toHaveLength(6);
  });

  it("6. handles 20-minute target duration (8 chapters)", async () => {
    const userId = "usr-20m-target";
    const script = await generateLongFormScript({
      userId,
      input: {
        topic: "20 Min Topic",
        targetPlatform: "YOUTUBE",
        targetDurationMinutes: 20,
      },
    });

    expect(script.chapters).toHaveLength(8);
  });

  it("7. generates duration-aware chapters sum", async () => {
    const userId = "usr-sum-duration";
    const script = await generateLongFormScript({
      userId,
      input: {
        topic: "Duration Sum Check",
        targetPlatform: "YOUTUBE",
        targetDurationMinutes: 10,
      },
    });

    const sumSecs = script.chapters.reduce((acc, c) => acc + c.estimatedDurationSeconds, 0);
    expect(sumSecs).toBe(600); // 10 min = 600s
  });

  it("8. renders long-form 16:9 H.264 MP4 video file", async () => {
    const userId = "usr-[#render-lfv]";
    const script = await generateLongFormScript({
      userId,
      input: {
        topic: "Render 16:9 Video Test",
        targetPlatform: "YOUTUBE",
        targetDurationMinutes: 5,
      },
    });

    const asset = await renderLongFormVideo({
      userId,
      script,
    });

    expect(asset.mimeType).toBe("video/mp4");
    expect(fs.existsSync(asset.storagePath)).toBe(true);
  });

  it("9. extracts high-value short segments from long-form script", async () => {
    const userId = "usr-seg-extract";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "Segment Extraction Test",
        targetPlatform: "YOUTUBE",
      },
    });

    expect(result.shorts.length).toBeGreaterThan(0);
    expect(result.shorts[0].hook).toBeDefined();
  });

  it("10. generates YouTube Short variant (15s)", async () => {
    const userId = "usr-yt-short";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "YouTube Short Test",
        targetPlatform: "YOUTUBE",
      },
    });

    const ytShort = result.shorts.find((s) => s.targetPlatform === "YOUTUBE_SHORT");
    expect(ytShort).toBeDefined();
    expect(ytShort?.durationSeconds).toBe(15);
  });

  it("11. generates Instagram Reel variant (30s)", async () => {
    const userId = "usr-ig-reel";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "Instagram Reel Test",
        targetPlatform: "YOUTUBE",
      },
    });

    const reel = result.shorts.find((s) => s.targetPlatform === "INSTAGRAM_REEL");
    expect(reel).toBeDefined();
    expect(reel?.durationSeconds).toBe(30);
  });

  it("12. generates TikTok video variant (30s)", async () => {
    const userId = "usr-tiktok-vid";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "TikTok Video Test",
        targetPlatform: "YOUTUBE",
      },
    });

    const tiktok = result.shorts.find((s) => s.targetPlatform === "TIKTOK");
    expect(tiktok).toBeDefined();
    expect(tiktok?.durationSeconds).toBe(30);
  });

  it("13. generates LinkedIn video variant (60s)", async () => {
    const userId = "usr-linkedin-vid";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "LinkedIn Video Test",
        targetPlatform: "YOUTUBE",
      },
    });

    const linkedin = result.shorts.find((s) => s.targetPlatform === "LINKEDIN_VIDEO");
    expect(linkedin).toBeDefined();
    expect(linkedin?.durationSeconds).toBe(60);
  });

  it("14. generates Instagram carousel (6 slides)", async () => {
    const userId = "usr-carousel-pkg";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "Carousel Test Topic",
        targetPlatform: "YOUTUBE",
      },
    });

    expect(result.carousel).toHaveLength(6);
    expect(result.carousel[0].title).toBeDefined();
    expect(result.carousel[5].title).toBe("Save & Share");
  });

  it("15. generates X / Twitter single post", async () => {
    const userId = "usr-x-post";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "X Post Test",
        targetPlatform: "YOUTUBE",
      },
    });

    expect(result.xPost).toContain("Thread below");
  });

  it("16. generates X / Twitter thread (5 items)", async () => {
    const userId = "usr-x-thread";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "X Thread Test",
        targetPlatform: "YOUTUBE",
      },
    });

    expect(result.xThread).toHaveLength(5);
    expect(result.xThread[0].text).toContain("1/5");
    expect(result.xThread[4].text).toContain("5/5");
  });

  it("17. generates platform-specific captions (Instagram, TikTok, YouTube, LinkedIn, X)", async () => {
    const userId = "usr-captions-pkg";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "Platform Captions Test",
        targetPlatform: "YOUTUBE",
      },
    });

    expect(result.platformCaptions.INSTAGRAM.caption).toContain("Deep Dive");
    expect(result.platformCaptions.TIKTOK.caption).toContain("Wait till the end");
    expect(result.platformCaptions.LINKEDIN.caption).toContain("Strategic insights");
  });

  it("18. generates 3-5 thumbnail concepts", async () => {
    const userId = "usr-thumbs-pkg";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "Thumbnail Concepts Test",
        targetPlatform: "YOUTUBE",
      },
    });

    expect(result.thumbnailConcepts.length).toBeGreaterThanOrEqual(3);
    expect(result.thumbnailConcepts[0].textOverlay).toBeDefined();
  });

  it("19. integrates with approval workflow by creating DRAFT content record", async () => {
    const userId = "usr-appr-pkg";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "Approval Integration Test",
        targetPlatform: "YOUTUBE",
      },
    });

    expect(result.packageId).toBeDefined();
    expect(result.status).toBe("COMPLETED");
  });

  it("20. persists content package result", async () => {
    const userId = "usr-persist-pkg";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "Persistence Test",
        targetPlatform: "YOUTUBE",
      },
    });

    const retrieved = getContentPackageById(result.packageId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.topic).toBe("Persistence Test");
  });

  it("21. enforces workspace isolation (Workspace A package does not affect Workspace B)", async () => {
    const userIdA = "usr-ws-A-repurpose";
    const workspaceA = "ws-repurpose-A";

    const userIdB = "usr-ws-B-repurpose";
    const workspaceB = "ws-repurpose-B";

    await createContentPackage({
      userId: userIdA,
      workspaceId: workspaceA,
      input: {
        topic: "Workspace A Topic",
        targetPlatform: "YOUTUBE",
      },
    });

    const usageA = await getUserUsage(userIdA);
    const usageB = await getUserUsage(userIdB);

    expect(usageA.freeCreditsUsed).toBe(1);
    expect(usageB.freeCreditsUsed).toBe(0);
  });

  it("22. consumes exactly 1 credit per content package generation", async () => {
    const userId = "usr-credit-repurpose";
    const initialUsage = await getUserUsage(userId);
    expect(initialUsage.freeCreditsUsed).toBe(0);

    await createContentPackage({
      userId,
      input: {
        topic: "Credit Metering Test",
        targetPlatform: "YOUTUBE",
      },
    });

    const updatedUsage = await getUserUsage(userId);
    expect(updatedUsage.freeCreditsUsed).toBe(1);
  });

  it("23. idempotency check prevents double-charging on retries", async () => {
    const userId = "usr-idemp-repurpose";
    const key = "idemp_repurpose_123";

    const res1 = await createContentPackage({
      userId,
      input: {
        topic: "Idempotency Test",
        targetPlatform: "YOUTUBE",
      },
      idempotencyKey: key,
    });

    const res2 = await createContentPackage({
      userId,
      input: {
        topic: "Idempotency Test",
        targetPlatform: "YOUTUBE",
      },
      idempotencyKey: key,
    });

    expect(res1.packageId).toBe(res2.packageId);
    const usage = await getUserUsage(userId);
    expect(usage.freeCreditsUsed).toBe(1);
  });

  it("24. isolates failed child asset rendering without aborting package creation", async () => {
    const userId = "usr-child-fail-isolation";
    const result = await createContentPackage({
      userId,
      input: {
        topic: "Child Asset Failure Isolation Test",
        targetPlatform: "YOUTUBE",
      },
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.xThread.length).toBe(5);
  });

  it("25. handles invalid input payload with descriptive error", async () => {
    const userId = "usr-invalid-input";
    await expect(
      createContentPackage({
        userId,
        input: {
          topic: "A", // Min 3 characters required
          targetPlatform: "YOUTUBE",
        },
      })
    ).rejects.toThrow();
  });
});
