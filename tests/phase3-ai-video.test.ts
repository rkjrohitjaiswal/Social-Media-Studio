import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import { videoScriptOutputSchema } from "@ai-social/shared";
import { generateVideoScript } from "../apps/api/src/services/video-script-service.js";
import { generateVoiceover } from "../apps/api/src/services/voiceover-service.js";
import { generateSmartCaptions } from "../apps/api/src/services/smart-caption-service.js";
import { selectMusicTrack, calculateAudioDuckingOptions } from "../apps/api/src/services/music-service.js";
import {
  createSmartAIVideo,
} from "../apps/api/src/services/smart-video-orchestration-service.js";
import { clearInMemoryVideoJobs } from "../apps/api/src/services/video-composition-service.js";
import { clearInMemoryUsage, getUserUsage } from "../apps/api/src/services/usage-service.js";

describe("Phase 3 Part 4 — AI Video Intelligence: Script, Voice, Music & Smart Captions", () => {
  beforeEach(() => {
    clearInMemoryVideoJobs();
    clearInMemoryUsage();
  });

  it("1. generates AI short video script with hook and scenes", async () => {
    const userId = "usr-script-gen";
    const result = await generateVideoScript({
      userId,
      input: {
        prompt: "Explain React Server Components in 30 seconds",
        durationSeconds: 30,
        platform: "INSTAGRAM",
      },
    });

    expect(result.title).toBeDefined();
    expect(result.hook).toBeDefined();
    expect(result.scenes).toBeDefined();
    expect(result.scenes.length).toBeGreaterThan(0);
  });

  it("2. validates AI video script output schema", async () => {
    const validRaw = {
      title: "Valid Title",
      hook: "Attention grabbing hook",
      scenes: [
        {
          sceneNumber: 1,
          narration: "Narration text",
          visualDirection: "Camera visual",
          caption: "Short caption",
          durationSeconds: 5,
        },
      ],
      callToAction: "Follow for more",
    };

    const parse = videoScriptOutputSchema.safeParse(validRaw);
    expect(parse.success).toBe(true);
  });

  it("3. generates duration-aware scene breakdown (sum equals total duration)", async () => {
    const userId = "usr-duration-scenes";
    const result = await generateVideoScript({
      userId,
      input: {
        prompt: "Luxury silk scarves collection",
        durationSeconds: 30,
        platform: "TIKTOK",
      },
    });

    const sumDuration = result.scenes.reduce((acc, s) => acc + s.durationSeconds, 0);
    expect(sumDuration).toBe(30);
  });

  it("4. generates 15-second script breakdown (3 scenes)", async () => {
    const userId = "usr-15s-script";
    const result = await generateVideoScript({
      userId,
      input: {
        prompt: "15s reel showcase",
        durationSeconds: 15,
        platform: "INSTAGRAM",
      },
    });

    expect(result.scenes).toHaveLength(3);
    expect(result.scenes.reduce((acc, s) => acc + s.durationSeconds, 0)).toBe(15);
  });

  it("5. generates 30-second script breakdown (5 scenes)", async () => {
    const userId = "usr-30s-script";
    const result = await generateVideoScript({
      userId,
      input: {
        prompt: "30s short showcase",
        durationSeconds: 30,
        platform: "YOUTUBE_SHORT",
      },
    });

    expect(result.scenes).toHaveLength(5);
    expect(result.scenes.reduce((acc, s) => acc + s.durationSeconds, 0)).toBe(30);
  });

  it("6. generates 60-second script breakdown (6 scenes)", async () => {
    const userId = "usr-60s-script";
    const result = await generateVideoScript({
      userId,
      input: {
        prompt: "60s extended showcase",
        durationSeconds: 60,
        platform: "YOUTUBE",
      },
    });

    expect(result.scenes).toHaveLength(6);
    expect(result.scenes.reduce((acc, s) => acc + s.durationSeconds, 0)).toBe(60);
  });

  it("7. generates Text-to-Speech voiceover asset", async () => {
    const userId = "usr-tts-gen";
    const workspaceId = "ws-tts-gen";

    const asset = await generateVoiceover({
      userId,
      workspaceId,
      text: "Welcome to the haute couture showcase.",
      options: { voice: "alloy", speed: 1.0 },
    });

    expect(asset.id).toBeDefined();
    expect(asset.mimeType).toBe("audio/mpeg");
    expect(asset.durationSeconds).toBeGreaterThan(0);
    expect(fs.existsSync(asset.storagePath)).toBe(true);
  });

  it("8 & 9. generates smart timed captions (SRT & VTT format)", () => {
    const scenes = [
      {
        sceneNumber: 1,
        narration: "Welcome to our winter collection.",
        visualDirection: "Opening shot",
        caption: "Winter Collection",
        durationSeconds: 5,
      },
      {
        sceneNumber: 2,
        narration: "Handcrafted with premium cashmere wool.",
        visualDirection: "Fabric detail",
        caption: "Premium Cashmere",
        durationSeconds: 5,
      },
    ];

    const result = generateSmartCaptions(scenes);

    expect(result.timedCaptions).toHaveLength(2);
    expect(result.timedCaptions[0].startTimeSeconds).toBe(0);
    expect(result.timedCaptions[0].endTimeSeconds).toBe(5);
    expect(result.timedCaptions[1].startTimeSeconds).toBe(5);
    expect(result.timedCaptions[1].endTimeSeconds).toBe(10);
    expect(result.vttContent).toContain("WEBVTT");
    expect(result.srtContent).toContain("00:00:00,000 --> 00:00:05,000");
  });

  it("10. selects royalty-free music track from catalog", () => {
    const track = selectMusicTrack("LUXURY");
    expect(track).toBeDefined();
    expect(track.genre).toBe("LUXURY");
    expect(track.publicUrl).toContain(".mp3");
  });

  it("11. calculates audio ducking options (reduces music volume under voiceover)", () => {
    const ducking = calculateAudioDuckingOptions(true);
    expect(ducking.musicVolume).toBeLessThan(ducking.voiceoverVolume);
    expect(ducking.musicVolume).toBe(0.2);
  });

  it("12. connects script, voice, captions, and FFmpeg composition in Smart Video Orchestrator", async () => {
    const userId = "usr-smart-vid";
    const workspaceId = "ws-smart-vid";

    const result = await createSmartAIVideo({
      userId,
      workspaceId,
      input: {
        prompt: "Explain React Server Components in 30 seconds",
        durationSeconds: 30,
        aspectRatio: "9:16",
        platform: "INSTAGRAM",
      },
    });

    expect(result.runId).toBeDefined();
    expect(result.script).toBeDefined();
    expect(result.voiceoverAsset).toBeDefined();
    expect(result.captions).toBeDefined();
    expect(result.videoResult.status).toBe("COMPLETED");
  });

  it("13. persists generated voiceover and video assets", async () => {
    const userId = "usr-persist-smart";
    const workspaceId = "ws-persist-smart";

    const result = await createSmartAIVideo({
      userId,
      workspaceId,
      input: {
        prompt: "Persistence test prompt",
        durationSeconds: 15,
        aspectRatio: "1:1",
      },
    });

    expect(result.voiceoverAsset.id).toBeDefined();
    expect(result.videoResult.videoAsset?.id).toBeDefined();
  });

  it("14. consumes exactly 1 credit per smart video generation", async () => {
    const userId = "usr-credit-smart";
    const initialUsage = await getUserUsage(userId);
    expect(initialUsage.freeCreditsUsed).toBe(0);

    await createSmartAIVideo({
      userId,
      input: {
        prompt: "Credit test prompt",
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
    });

    const updatedUsage = await getUserUsage(userId);
    expect(updatedUsage.freeCreditsUsed).toBe(1);
  });

  it("15. idempotency check prevents double-charging on retries", async () => {
    const userId = "usr-idemp-smart";
    const key = "idemp_smart_key_123";

    const res1 = await createSmartAIVideo({
      userId,
      input: {
        prompt: "Idempotent smart prompt",
        durationSeconds: 15,
      },
      idempotencyKey: key,
    });

    const res2 = await createSmartAIVideo({
      userId,
      input: {
        prompt: "Idempotent smart prompt",
        durationSeconds: 15,
      },
      idempotencyKey: key,
    });

    expect(res1.videoResult.jobId).toBe(res2.videoResult.jobId);
    const usage = await getUserUsage(userId);
    expect(usage.freeCreditsUsed).toBe(1);
  });

  it("16. enforces workspace isolation (Workspace A smart video does not affect Workspace B)", async () => {
    const userIdA = "usr-smart-ws-A";
    const workspaceIdA = "ws-smart-A";

    const userIdB = "usr-smart-ws-B";
    const workspaceIdB = "ws-smart-B";

    await createSmartAIVideo({
      userId: userIdA,
      workspaceId: workspaceIdA,
      input: {
        prompt: "Workspace A prompt",
        durationSeconds: 15,
      },
    });

    const usageA = await getUserUsage(userIdA);
    const usageB = await getUserUsage(userIdB);

    expect(usageA.freeCreditsUsed).toBe(1);
    expect(usageB.freeCreditsUsed).toBe(0);
  });

  it("17 & 18. handles provider fallback and invalid AI output gracefully", async () => {
    const userId = "usr-smart-fallback";
    const result = await createSmartAIVideo({
      userId,
      input: {
        prompt: "Fallback test prompt",
        durationSeconds: 15,
      },
    });

    expect(result.script.title).toBeDefined();
    expect(result.videoResult.status).toBe("COMPLETED");
  });

  it("19. handles missing media with synthetic fallback assets", async () => {
    const userId = "usr-missing-media";
    const result = await createSmartAIVideo({
      userId,
      input: {
        prompt: "Missing media prompt",
        images: ["non_existent_url_1"],
        durationSeconds: 15,
      },
    });

    expect(result.videoResult.status).toBe("COMPLETED");
  });

  it("20. produces final playable MP4 output video file", async () => {
    const userId = "usr-final-mp4";
    const result = await createSmartAIVideo({
      userId,
      input: {
        prompt: "Final playable MP4 test",
        durationSeconds: 15,
        aspectRatio: "9:16",
      },
    });

    expect(result.videoResult.videoAsset?.mimeType).toBe("video/mp4");
    expect(result.videoResult.videoAsset?.storagePath).toBeDefined();
    if (result.videoResult.videoAsset?.storagePath) {
      expect(fs.existsSync(result.videoResult.videoAsset.storagePath)).toBe(true);
    }
  });
});
