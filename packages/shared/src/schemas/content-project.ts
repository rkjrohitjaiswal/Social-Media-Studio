import { z } from "zod";
import { ContentPackageResult } from "./repurposing-package";

export const contentProjectStatusEnum = z.enum([
  "DRAFT",
  "GENERATING",
  "READY",
  "IN_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
]);

export type ContentProjectStatus = z.infer<typeof contentProjectStatusEnum>;

export const createContentProjectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  sourceText: z.string().optional().default(""),
  referenceUrls: z.array(z.string().url()).optional().default([]),
  referenceImages: z.array(z.string()).optional().default([]),
  targetDurationMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]).optional().default(5),
  tone: z.string().optional().default("Educational & Engaging"),
  audience: z.string().optional().default("Tech & Creator Audience"),
});

export type CreateContentProjectInput = z.input<typeof createContentProjectSchema>;

export const updateContentProjectSchema = createContentProjectSchema.partial().extend({
  status: contentProjectStatusEnum.optional(),
});

export type UpdateContentProjectInput = z.input<typeof updateContentProjectSchema>;

export interface ProjectAssetVersion {
  versionId: string;
  timestamp: string;
  package: ContentPackageResult;
  audioState?: ProjectAudioState;
}

export interface ContentProjectDto {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  topic: string;
  sourceText: string;
  referenceUrls: string[];
  referenceImages: string[];
  sourceAssets?: any[];
  contentMode?: string;
  platformPreset?: string;
  youtubeMetadata?: {
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
    chapters: Array<{ timestamp: string; title: string; durationSeconds: number }>;
  };
  thumbnailUrl?: string;
  thumbnailVariants?: string[];
  backgroundMusicUrl?: string;
  backgroundMusicVolume?: number;
  textOverlays?: any[];
  versionNumber?: number;
  currentVersionNumber?: number;
  status: ContentProjectStatus;
  package?: ContentPackageResult | null;
  audioState?: ProjectAudioState;
  versions: ProjectAssetVersion[];
  scheduledPosts: Array<{
    id: string;
    platform: string;
    scheduledAt: string;
    status: string;
  }>;
  publishedPosts: Array<{
    id: string;
    platform: string;
    externalPostId: string;
    permalink: string;
    publishedAt: string;
  }>;
  creditsConsumed: number;
  progressPercent: number;
  completedAssetsCount: number;
  totalAssetsCount: number;
  createdAt: string;
  updatedAt: string;
}

export const editorSceneSchema = z.object({
  id: z.string(),
  sceneNumber: z.number(),
  type: z.enum(["CHAPTER", "SHORT", "CAROUSEL", "THUMBNAIL"]),
  title: z.string(),
  durationSeconds: z.number().min(1).max(300),
  platform: z.string(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO"]).optional().default("IMAGE"),
  narration: z.string().optional(),
  caption: z.string().optional(),
  prompt: z.string().optional(),
  referenceImages: z.array(z.string()).optional().default([]),
  generatedVideoUrl: z.string().optional(),
  videoJobId: z.string().optional(),
  videoStatus: z.enum(["QUEUED", "GENERATING", "COMPLETED", "FAILED"]).optional(),
  motion: z.string().optional(),
  status: z.enum(["READY", "MODIFIED", "REGENERATING"]).optional().default("READY"),
});

export type EditorScene = z.input<typeof editorSceneSchema>;

export const voiceoverConfigSchema = z.object({
  enabled: z.boolean().default(true),
  provider: z.string().optional().default("OPENAI"),
  voice: z.string().optional().default("alloy"),
  language: z.string().optional().default("en"),
  speed: z.number().min(0.5).max(2.0).optional().default(1.0),
  volume: z.number().min(0).max(1).optional().default(1.0),
  audioUrl: z.string().optional(),
  durationSeconds: z.number().optional(),
  status: z.enum(["IDLE", "GENERATING", "READY", "ERROR"]).optional().default("IDLE"),
});

export type VoiceoverConfig = z.infer<typeof voiceoverConfigSchema>;

export const musicConfigSchema = z.object({
  enabled: z.boolean().default(true),
  trackId: z.string().optional().default("track_luxury_lounge"),
  audioUrl: z.string().optional(),
  volume: z.number().min(0).max(1).optional().default(0.25),
  fadeIn: z.number().min(0).max(10).optional().default(1.0),
  fadeOut: z.number().min(0).max(10).optional().default(1.5),
  startTime: z.number().min(0).optional().default(0),
  durationSeconds: z.number().optional(),
});

export type MusicConfig = z.input<typeof musicConfigSchema>;

export const captionSegmentSchema = z.object({
  id: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  text: z.string(),
  highlightedWord: z.string().optional(),
});

export type CaptionSegment = z.input<typeof captionSegmentSchema>;

export const captionsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  style: z.enum(["CLEAN", "BOLD", "MINIMAL", "SOCIAL", "HIGHLIGHT"]).default("SOCIAL"),
  position: z.enum(["BOTTOM", "CENTER", "TOP"]).default("BOTTOM"),
  fontSize: z.number().min(12).max(72).default(24),
  color: z.string().default("#FFFFFF"),
  highlightColor: z.string().default("#C5A059"),
  background: z.enum(["NONE", "SOLID", "SEMI_TRANSPARENT"]).default("SEMI_TRANSPARENT"),
  segments: z.array(captionSegmentSchema).optional().default([]),
  length: z.number().optional(),
});

export type CaptionsConfig = z.input<typeof captionsConfigSchema> & { length?: number };

export const textOverlaySchema = z.object({
  id: z.string(),
  sceneId: z.string().optional(),
  text: z.string(),
  type: z.enum(["HEADLINE", "SUBTITLE", "CTA", "CUSTOM"]),
  startTime: z.number(),
  endTime: z.number(),
  timestamp: z.union([z.number(), z.string()]).optional(),
  position: z.enum(["TOP", "CENTER", "BOTTOM"]).default("CENTER"),
  fontSize: z.number().min(12).max(72).default(28),
  fontWeight: z.enum(["NORMAL", "MEDIUM", "BOLD"]).default("BOLD"),
  animation: z.enum(["NONE", "FADE", "SLIDE_UP", "POP"]).default("FADE"),
  color: z.string().default("#FFFFFF"),
  background: z.string().optional().default("transparent"),
  alignment: z.enum(["LEFT", "CENTER", "RIGHT"]).default("CENTER"),
  style: z.string().optional(),
});

export type TextOverlay = z.infer<typeof textOverlaySchema>;

export const projectAudioStateSchema = z.object({
  voiceover: voiceoverConfigSchema.optional(),
  music: musicConfigSchema.optional(),
  captions: captionsConfigSchema.optional(),
  textOverlays: z.array(textOverlaySchema).optional().default([]),
});

export type ProjectAudioState = z.infer<typeof projectAudioStateSchema>;

export const saveProjectVersionSchema = z.object({
  scenes: z.array(editorSceneSchema).optional(),
  updatedPackage: z.any().optional(),
  audioState: projectAudioStateSchema.optional(),
  versionLabel: z.string().optional(),
});

export type SaveProjectVersionInput = z.infer<typeof saveProjectVersionSchema>;

export const regenerateSceneSchema = z.object({
  sceneId: z.string(),
  prompt: z.string().optional(),
});

export type RegenerateSceneInput = z.infer<typeof regenerateSceneSchema>;
