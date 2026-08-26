import {
  LongFormScriptOutput,
  VideoAssetDto,
} from "@ai-social/shared";
import { composeVideo } from "./video-composition-service.js";

/**
 * Long-Form YouTube Video Renderer Service.
 * Converts long-form script chapters into 16:9 H.264 / AAC playable MP4 video.
 */
export async function renderLongFormVideo(params: {
  userId: string;
  workspaceId?: string;
  script: LongFormScriptOutput;
  idempotencyKey?: string;
}): Promise<VideoAssetDto> {
  const { userId, workspaceId = "demo-workspace-1", script, idempotencyKey } = params;

  const totalDuration = script.chapters.reduce((acc, c) => acc + c.estimatedDurationSeconds, 0);
  const images = [
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
  ];

  const result = await composeVideo({
    userId,
    workspaceId,
    input: {
      images,
      durationSeconds: totalDuration >= 60 ? 60 : 30, // Normalize output duration for composition
      aspectRatio: "16:9",
      title: script.title,
      captions: script.chapters.map((c) => c.title),
      transition: "fade",
      fps: 24,
    },
    idempotencyKey: idempotencyKey || `long_video_${Date.now()}`,
    skipCreditCheck: true,
  });

  if (result.status === "FAILED" || !result.videoAsset) {
    throw new Error(result.errorMessage || "Long-form video composition failed");
  }

  return result.videoAsset;
}
