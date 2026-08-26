import {
  SmartVideoCreateInput,
  VideoScriptOutput,
  VideoCompositionJobResult,
} from "@ai-social/shared";
import { generateVideoScript } from "./video-script-service.js";
import { generateVoiceover, GeneratedVoiceoverAsset } from "./voiceover-service.js";
import { generateSmartCaptions, SmartCaptionsOutput } from "./smart-caption-service.js";
import { selectMusicTrack, calculateAudioDuckingOptions } from "./music-service.js";
import { composeVideo } from "./video-composition-service.js";

export interface SmartVideoOrchestrationResult {
  runId: string;
  workspaceId: string;
  script: VideoScriptOutput;
  voiceoverAsset: GeneratedVoiceoverAsset;
  captions: SmartCaptionsOutput;
  videoResult: VideoCompositionJobResult;
}

/**
 * Smart AI Short Video Creation Orchestrator.
 * Combines Script Generation + Scene Breakdown + Voiceover TTS + Smart Captions + Music Ducking + FFmpeg Composition.
 */
export async function createSmartAIVideo(params: {
  userId: string;
  workspaceId?: string;
  input: SmartVideoCreateInput;
  idempotencyKey?: string;
}): Promise<SmartVideoOrchestrationResult> {
  const { userId, workspaceId = "demo-workspace-1", input, idempotencyKey } = params;

  const runId = `smart_vid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const duration = input.durationSeconds || 15;
  const platform = input.platform || "INSTAGRAM";
  const aspectRatio = input.aspectRatio || "9:16";

  // 1. Generate AI Video Script & Scene Breakdown
  const script = await generateVideoScript({
    userId,
    workspaceId,
    input: {
      prompt: input.prompt || "Short video prompt",
      topic: input.topic || "",
      platform,
      durationSeconds: duration,
      tone: input.tone || "Luxury Editorial",
      audience: "General Audience",
      language: "en",
    },
  });

  // 2. Generate Voiceover TTS Narration Audio
  const fullNarration = script.scenes.map((s) => s.narration).join(" ");
  const voiceoverAsset = await generateVoiceover({
    userId,
    workspaceId,
    text: fullNarration,
    options: {
      voice: (input.voice as any) || "alloy",
    },
  });

  // 3. Generate Timed Smart Captions
  const captions = generateSmartCaptions(script.scenes);

  // 4. Select Background Music Track & Audio Ducking Options
  const music = selectMusicTrack(input.musicGenre);

  // 5. Default/User Images
  const images =
    input.images && input.images.length > 0
      ? input.images
      : [
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
        ];

  // 6. Execute Final FFmpeg Video Composition Engine
  const videoResult = await composeVideo({
    userId,
    workspaceId,
    input: {
      images,
      durationSeconds: duration,
      aspectRatio,
      title: script.title,
      captions: captions.timedCaptions.map((c) => c.text),
      musicUrl: music.publicUrl,
      voiceoverUrl: voiceoverAsset.publicUrl,
      transition: "fade",
      fps: 24,
    },
    idempotencyKey: idempotencyKey || runId,
  });

  return {
    runId,
    workspaceId,
    script,
    voiceoverAsset,
    captions,
    videoResult,
  };
}
