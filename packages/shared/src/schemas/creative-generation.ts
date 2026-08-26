import { z } from "zod";

export const aspectRatioEnum = z.enum(["1:1", "4:5", "9:16", "16:9"]);
export type AspectRatio = z.infer<typeof aspectRatioEnum>;

export const generateCreativesSchema = z.object({
  referenceImageUrl: z.string().url().optional().or(z.literal("")),
  inputImageUrls: z.array(z.string().url()).min(1, "At least one input image is required").max(5, "Maximum 5 input images allowed"),
  creativeBrief: z.string().min(3, "Creative brief must be at least 3 characters long"),
  platform: z.enum([
    "INSTAGRAM",
    "LINKEDIN",
    "THREADS",
    "PINTEREST",
    "FACEBOOK",
    "TIKTOK",
    "YOUTUBE",
    "X",
    "REDDIT",
    "TELEGRAM",
    "BLUESKY",
  ]).default("INSTAGRAM"),
  aspectRatio: aspectRatioEnum.default("4:5"),
  count: z.number().int().min(1).max(4).default(2),
  stylePreset: z.string().optional().default("LUXURY"),
});

export type GenerateCreativesInput = z.input<typeof generateCreativesSchema>;

export interface GeneratedCreativeVariant {
  id: string;
  jobId: string;
  variantNumber: number;
  imageUrl: string;
  aspectRatio: AspectRatio;
  platform: string;
  stylePreset: string;
  promptUsed: string;
  headline: string;
  caption: string;
  hashtags: string[];
  qualityScore: number;
  createdAt: string;
}

export interface CreativeGenerationRunResult {
  runId: string;
  workspaceId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  variants: GeneratedCreativeVariant[];
  createdAt: string;
}
