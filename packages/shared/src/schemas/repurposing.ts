import { z } from "zod";
import { supportedProvidersSchema } from "./ai-providers";

export const repurposeContentSchema = z.object({
  sourceText: z.string().min(10, "Source content must be at least 10 characters long"),
  targetPlatforms: z.array(z.string()).min(1, "Select at least one target platform"),
  provider: supportedProvidersSchema.default("OPENAI"),
  model: z.string().optional(),
});

export type RepurposeContentInput = z.infer<typeof repurposeContentSchema>;

export const adaptContentSchema = z.object({
  baseContent: z.string().min(5, "Base content is required"),
  targetPlatforms: z.array(z.string()).min(1, "Select at least one target platform"),
  provider: supportedProvidersSchema.default("OPENAI"),
  model: z.string().optional(),
});

export type AdaptContentInput = z.infer<typeof adaptContentSchema>;

export interface PlatformAdaptedOutput {
  platform: string;
  title?: string;
  caption: string;
  hashtags: string[];
  callToAction?: string;
  suggestedMediaPrompt?: string;
}

export interface RepurposeResponse {
  success: boolean;
  outputs: Record<string, PlatformAdaptedOutput>;
  workflowsConsumed: number;
}
