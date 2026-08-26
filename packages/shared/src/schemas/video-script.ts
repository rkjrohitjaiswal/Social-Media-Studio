import { z } from "zod";

export const videoScriptPlatformEnum = z.enum([
  "INSTAGRAM",
  "YOUTUBE_SHORT",
  "TIKTOK",
  "YOUTUBE",
]);
export type VideoScriptPlatform = z.infer<typeof videoScriptPlatformEnum>;

export const generateVideoScriptSchema = z.object({
  topic: z.string().optional().default(""),
  prompt: z.string().min(3, "Prompt must be at least 3 characters long"),
  platform: videoScriptPlatformEnum.default("INSTAGRAM"),
  durationSeconds: z.union([z.literal(15), z.literal(30), z.literal(60)]).default(15),
  tone: z.string().optional().default("Luxury Editorial"),
  audience: z.string().optional().default("High Net Worth Consumers"),
  language: z.string().optional().default("en"),
});

export type GenerateVideoScriptInput = z.input<typeof generateVideoScriptSchema>;

export const scriptSceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  narration: z.string().min(1, "Scene narration is required"),
  visualDirection: z.string().min(1, "Visual direction is required"),
  caption: z.string().min(1, "Scene caption is required"),
  durationSeconds: z.number().positive(),
});

export type ScriptScene = z.infer<typeof scriptSceneSchema>;

export const videoScriptOutputSchema = z.object({
  title: z.string().min(1, "Video title is required"),
  hook: z.string().min(1, "Video hook is required"),
  scenes: z.array(scriptSceneSchema).min(1, "At least 1 scene is required"),
  callToAction: z.string().optional().default(""),
});

export type VideoScriptOutput = z.infer<typeof videoScriptOutputSchema>;

export interface TimedCaption {
  index: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  text: string;
}

export interface VoiceoverOptions {
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  speed?: number;
  language?: string;
}

export interface SmartVideoCreateInput {
  prompt: string;
  topic?: string;
  platform?: VideoScriptPlatform;
  durationSeconds?: 15 | 30 | 60;
  aspectRatio?: "9:16" | "1:1" | "16:9";
  images?: string[];
  tone?: string;
  voice?: string;
  musicGenre?: string;
}
