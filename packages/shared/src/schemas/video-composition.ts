import { z } from "zod";

export const videoAspectRatioEnum = z.enum(["9:16", "1:1", "16:9"]);
export type VideoAspectRatio = z.infer<typeof videoAspectRatioEnum>;

export const videoDurationEnum = z.enum(["15", "30", "60"]).transform((v) => Number(v) as 15 | 30 | 60);

export const composeVideoSchema = z.object({
  images: z.array(z.string().url()).min(1, "At least 1 image is required").max(10, "Maximum 10 images allowed"),
  durationSeconds: z.union([z.literal(15), z.literal(30), z.literal(60)]).default(15),
  aspectRatio: videoAspectRatioEnum.default("9:16"),
  title: z.string().optional().default(""),
  captions: z.array(z.string()).optional().default([]),
  musicUrl: z.string().url().optional().or(z.literal("")),
  voiceoverUrl: z.string().url().optional().or(z.literal("")),
  transition: z.enum(["cut", "fade"]).default("fade"),
  fps: z.number().int().min(15).max(60).optional().default(24),
});

export type ComposeVideoInput = z.input<typeof composeVideoSchema>;

export interface VideoAssetDto {
  id: string;
  workspaceId: string;
  publicUrl: string;
  storagePath: string;
  aspectRatio: VideoAspectRatio;
  durationSeconds: number;
  width: number;
  height: number;
  mimeType: string;
  fileSizeBytes: number;
  title?: string;
  createdAt: string;
}

export interface VideoCompositionJobResult {
  jobId: string;
  workspaceId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progressPercent: number;
  errorMessage?: string;
  videoAsset?: VideoAssetDto;
  createdAt: string;
  updatedAt: string;
}
