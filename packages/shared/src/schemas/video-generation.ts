import { z } from "zod";

export const contentModeEnum = z.enum([
  "PRODUCT",
  "BRAND",
  "TECH",
  "EDUCATION",
  "NEWS",
  "TUTORIAL",
  "PERSONAL_BRAND",
  "BUSINESS",
  "FINANCE",
  "FITNESS",
  "TRAVEL",
  "ENTERTAINMENT",
  "GENERAL",
]);
export type VideoContentMode = z.infer<typeof contentModeEnum>;

export const platformPresetEnum = z.enum([
  "INSTAGRAM_REEL",
  "YOUTUBE_SHORT",
  "YOUTUBE_LONG",
  "INSTAGRAM_VIDEO",
  "INSTAGRAM_SQUARE",
]);
export type PlatformPreset = z.infer<typeof platformPresetEnum>;

export const videoJobStatusEnum = z.enum(["QUEUED", "GENERATING", "COMPLETED", "FAILED"]);
export type VideoJobStatus = z.infer<typeof videoJobStatusEnum>;

export const platformPresetConfigSchema = z.object({
  preset: platformPresetEnum,
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
  recommendedDurationSeconds: z.number(),
  safeMargins: z.string(),
  captionPosition: z.enum(["BOTTOM", "CENTER", "TOP"]),
  textSize: z.number(),
  scenePacing: z.string(),
});
export type PlatformPresetConfig = z.infer<typeof platformPresetConfigSchema>;

export const PLATFORM_PRESETS: Record<PlatformPreset, PlatformPresetConfig> = {
  YOUTUBE_SHORT: {
    preset: "YOUTUBE_SHORT",
    aspectRatio: "9:16",
    recommendedDurationSeconds: 30,
    safeMargins: "15% Top / 20% Bottom",
    captionPosition: "CENTER",
    textSize: 28,
    scenePacing: "Fast (2-4s per scene)",
  },
  INSTAGRAM_REEL: {
    preset: "INSTAGRAM_REEL",
    aspectRatio: "9:16",
    recommendedDurationSeconds: 30,
    safeMargins: "15% Top / 25% Bottom",
    captionPosition: "CENTER",
    textSize: 26,
    scenePacing: "Fast (2-4s per scene)",
  },
  YOUTUBE_LONG: {
    preset: "YOUTUBE_LONG",
    aspectRatio: "16:9",
    recommendedDurationSeconds: 600,
    safeMargins: "10% All sides",
    captionPosition: "BOTTOM",
    textSize: 22,
    scenePacing: "Editorial (5-10s per scene)",
  },
  INSTAGRAM_VIDEO: {
    preset: "INSTAGRAM_VIDEO",
    aspectRatio: "16:9",
    recommendedDurationSeconds: 60,
    safeMargins: "10% All sides",
    captionPosition: "BOTTOM",
    textSize: 24,
    scenePacing: "Moderate (4-6s per scene)",
  },
  INSTAGRAM_SQUARE: {
    preset: "INSTAGRAM_SQUARE",
    aspectRatio: "1:1",
    recommendedDurationSeconds: 30,
    safeMargins: "10% All sides",
    captionPosition: "BOTTOM",
    textSize: 24,
    scenePacing: "Moderate (3-5s per scene)",
  },
};

export const generateVideoJobSchema = z.object({
  prompt: z.string().min(3),
  inputImageUrls: z.array(z.string()).optional().default([]),
  referenceImageUrl: z.string().optional(),
  durationSeconds: z.number().int().positive().default(5),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  motionDirection: z.string().optional(),
  provider: z.string().optional().default("mock"),
});
export type GenerateVideoJobInput = z.input<typeof generateVideoJobSchema>;

export interface VideoJobDto {
  jobId: string;
  workspaceId: string;
  status: VideoJobStatus;
  progressPercent: number;
  videoUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export const youtubeChapterSchema = z.object({
  timestamp: z.string(),
  title: z.string(),
  durationSeconds: z.number(),
});
export type YouTubeChapter = z.infer<typeof youtubeChapterSchema>;

export const youtubeMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  hashtags: z.array(z.string()),
  chapters: z.array(youtubeChapterSchema),
});
export type YouTubeMetadata = z.infer<typeof youtubeMetadataSchema>;
