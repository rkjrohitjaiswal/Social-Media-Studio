import { z } from "zod";
import { VideoAssetDto } from "./video-composition";

export const targetDurationMinutesEnum = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(20),
]);

export const createContentPackageSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long"),
  sourceText: z.string().optional().default(""),
  referenceUrls: z.array(z.string().url()).optional().default([]),
  targetPlatform: z.literal("YOUTUBE").default("YOUTUBE"),
  targetDurationMinutes: targetDurationMinutesEnum.default(5),
  tone: z.string().optional().default("Educational & Engaging"),
  audience: z.string().optional().default("Tech & Creator Audience"),
  language: z.string().optional().default("en"),
});

export type CreateContentPackageInput = z.input<typeof createContentPackageSchema>;

export interface LongFormChapter {
  chapterNumber: number;
  title: string;
  narration: string;
  visualDirection: string;
  estimatedDurationSeconds: number;
  mediaUrl?: string;
}

export interface LongFormScriptOutput {
  title: string;
  description: string;
  hook: string;
  chapters: LongFormChapter[];
  callToAction?: string;
  keywords: string[];
  thumbnailConcepts: string[];
}

export interface ThumbnailConcept {
  id: string;
  title: string;
  visualPrompt: string;
  textOverlay: string;
  composition: string;
  emotionalHook: string;
  imageUrl?: string;
}

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  content: string;
  visualPrompt: string;
  imageUrl?: string;
  caption?: string;
}

export interface XThreadItem {
  postIndex: number;
  text: string;
}

export interface ShortVideoSegment {
  id: string;
  title: string;
  hook: string;
  startChapter: number;
  endChapter: number;
  narration: string;
  caption: string;
  reason: string;
  targetPlatform: "YOUTUBE_SHORT" | "INSTAGRAM_REEL" | "TIKTOK" | "LINKEDIN_VIDEO";
  durationSeconds: 15 | 30 | 60;
  videoAsset?: VideoAssetDto;
  videoUrl?: string;
}

export interface PlatformCaptionData {
  platform: string;
  caption: string;
  hashtags: string[];
  cta: string;
}

export interface ContentPackageResult {
  packageId: string;
  workspaceId: string;
  topic: string;
  longFormScript: LongFormScriptOutput;
  longFormVideoAsset?: VideoAssetDto;
  shorts: ShortVideoSegment[];
  carousel: CarouselSlide[];
  xPost: string;
  xThread: XThreadItem[];
  platformCaptions: Record<string, PlatformCaptionData>;
  thumbnailConcepts: ThumbnailConcept[];
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  updatedAt: string;
}
