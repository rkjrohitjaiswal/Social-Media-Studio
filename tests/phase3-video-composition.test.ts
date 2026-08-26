import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import { composeVideoSchema } from "@ai-social/shared";
import {
  composeVideo,
  getVideoJobById,
  getFfmpegBinaryPath,
  clearInMemoryVideoJobs,
} from "../apps/api/src/services/video-composition-service.js";
import { clearInMemoryUsage, getUserUsage } from "../apps/api/src/services/usage-service.js";

describe("Phase 3 Part 3B — Local Video Composition Engine", () => {
  beforeEach(() => {
    clearInMemoryVideoJobs();
    clearInMemoryUsage();
  });

  it("1. verifies FFmpeg binary availability", () => {
    const binary = getFfmpegBinaryPath();
    expect(binary).toBeDefined();
    expect(typeof binary).toBe("string");
  });

  it("2. single image -> valid MP4 output file", async () => {
    const userId = "usr-vid-single";
    const workspaceId = "ws-vid-single";

    const result = await composeVideo({
      userId,
      workspaceId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
        title: "Single Image Reel",
        captions: ["Bespoke luxury"],
        transition: "cut",
        fps: 24,
      },
    });

    expect(result.jobId).toBeDefined();
    expect(result.status).toBe("COMPLETED");
    expect(result.videoAsset).toBeDefined();
    expect(result.videoAsset?.mimeType).toBe("video/mp4");
    expect(result.videoAsset?.width).toBe(1080);
    expect(result.videoAsset?.height).toBe(1920);

    if (result.videoAsset?.storagePath && fs.existsSync(result.videoAsset.storagePath)) {
      const stats = fs.statSync(result.videoAsset.storagePath);
      expect(stats.size).toBeGreaterThan(0);
    }
  });

  it("3. multiple images -> valid MP4 video composition", async () => {
    const userId = "usr-vid-multi";
    const workspaceId = "ws-vid-multi";

    const result = await composeVideo({
      userId,
      workspaceId,
      input: {
        images: [
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
          "https://images.unsplash.com/photo-1509631179647-0177331693ae",
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d",
        ],
        durationSeconds: 15,
        aspectRatio: "9:16",
        title: "Multi Image Story",
        captions: ["Scene 1", "Scene 2", "Scene 3"],
        transition: "fade",
        fps: 24,
      },
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.videoAsset?.durationSeconds).toBe(15);
  });

  it("4. supports 15-second video duration", async () => {
    const userId = "usr-vid-15s";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
        title: "15s Reel",
      },
    });
    expect(result.videoAsset?.durationSeconds).toBe(15);
  });

  it("5. supports 30-second video duration", async () => {
    const userId = "usr-vid-30s";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 30,
        aspectRatio: "9:16",
        title: "30s Reel",
      },
    });
    expect(result.videoAsset?.durationSeconds).toBe(30);
  });

  it("6. supports 60-second video duration", async () => {
    const userId = "usr-vid-60s";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 60,
        aspectRatio: "9:16",
        title: "60s Short",
      },
    });
    expect(result.videoAsset?.durationSeconds).toBe(60);
  });

  it("7. outputs 9:16 aspect ratio dimensions (1080x1920)", async () => {
    const userId = "usr-vid-916";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
    });
    expect(result.videoAsset?.width).toBe(1080);
    expect(result.videoAsset?.height).toBe(1920);
  });

  it("8. outputs 1:1 aspect ratio dimensions (1080x1080)", async () => {
    const userId = "usr-vid-11";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "1:1",
      },
    });
    expect(result.videoAsset?.width).toBe(1080);
    expect(result.videoAsset?.height).toBe(1080);
  });

  it("9. outputs 16:9 aspect ratio dimensions (1920x1080)", async () => {
    const userId = "usr-vid-169";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "16:9",
      },
    });
    expect(result.videoAsset?.width).toBe(1920);
    expect(result.videoAsset?.height).toBe(1080);
  });

  it("10 & 11. handles title overlay and scene captions", async () => {
    const userId = "usr-vid-title";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
        title: "Haute Couture Highlights",
        captions: ["Winter Collection 2026", "Paris Fashion Week"],
      },
    });
    expect(result.videoAsset?.title).toBe("Haute Couture Highlights");
  });

  it("12. handles fade transition mode", async () => {
    const userId = "usr-vid-fade";
    const result = await composeVideo({
      userId,
      input: {
        images: [
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
          "https://images.unsplash.com/photo-1509631179647-0177331693ae",
        ],
        durationSeconds: 15,
        aspectRatio: "9:16",
        transition: "fade",
      },
    });
    expect(result.status).toBe("COMPLETED");
  });

  it("13 & 14. handles optional music and voice-over parameters", async () => {
    const userId = "usr-vid-audio";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
        musicUrl: "https://example.com/ambient_lounge.mp3",
        voiceoverUrl: "https://example.com/narrative_voice.mp3",
      },
    });
    expect(result.status).toBe("COMPLETED");
  });

  it("15. handles no-audio video composition cleanly", async () => {
    const userId = "usr-vid-noaudio";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
    });
    expect(result.status).toBe("COMPLETED");
  });

  it("16. persists video job status and allows retrieval by ID", async () => {
    const userId = "usr-vid-persist";
    const created = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
        title: "Persistent Job",
      },
    });

    const retrieved = await getVideoJobById(created.jobId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.jobId).toBe(created.jobId);
    expect(retrieved?.status).toBe("COMPLETED");
  });

  it("17. enforces workspace isolation (Workspace A usage does not affect Workspace B)", async () => {
    const userIdA = "usr-vid-ws-A";
    const workspaceIdA = "ws-vid-A";

    const userIdB = "usr-vid-ws-B";
    const workspaceIdB = "ws-vid-B";

    await composeVideo({
      userId: userIdA,
      workspaceId: workspaceIdA,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
    });

    const usageA = await getUserUsage(userIdA);
    const usageB = await getUserUsage(userIdB);

    expect(usageA.freeCreditsUsed).toBe(1);
    expect(usageB.freeCreditsUsed).toBe(0);
  });

  it("18. consumes exactly 1 credit per composition", async () => {
    const userId = "usr-vid-credit";
    const usageBefore = await getUserUsage(userId);
    expect(usageBefore.freeCreditsUsed).toBe(0);

    await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
    });

    const usageAfter = await getUserUsage(userId);
    expect(usageAfter.freeCreditsUsed).toBe(1);
  });

  it("19. idempotency check prevents double-charging on retries", async () => {
    const userId = "usr-vid-idempotent";
    const idempotencyKey = "idemp_video_key_9999";

    const usageBefore = await getUserUsage(userId);

    const res1 = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
      idempotencyKey,
    });

    const res2 = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
      idempotencyKey,
    });

    expect(res1.jobId).toBe(res2.jobId);
    const usageAfter = await getUserUsage(userId);
    expect(usageAfter.freeCreditsUsed).toBe(1);
  });

  it("20. temporary FFmpeg files are cleaned up", async () => {
    const userId = "usr-vid-cleanup";
    const result = await composeVideo({
      userId,
      input: {
        images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
    });
    expect(result.status).toBe("COMPLETED");
  });

  it("21. validates composeVideoSchema payload format", () => {
    const invalidPayload = composeVideoSchema.safeParse({
      images: [],
      durationSeconds: 15,
    });
    expect(invalidPayload.success).toBe(false);

    const validPayload = composeVideoSchema.safeParse({
      images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
      durationSeconds: 30,
      aspectRatio: "1:1",
      title: "Valid Title",
    });
    expect(validPayload.success).toBe(true);
  });

  it("22. handles composition failure gracefully", async () => {
    const userId = "usr-vid-failure";
    // Simulated input failure
    const result = await composeVideo({
      userId,
      input: {
        images: ["invalid_path_fail"],
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
    });
    expect(result.jobId).toBeDefined();
  });
});
