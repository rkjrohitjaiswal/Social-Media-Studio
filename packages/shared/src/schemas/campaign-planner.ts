import { z } from "zod";

export const aiCampaignInputSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  objective: z.string().min(1, "Objective is required"),
  productService: z.string().optional(),
  targetAudience: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  platforms: z.array(z.string()).min(1, "Select at least one platform"),
  budget: z.string().optional(),
  cta: z.string().optional(),
  offer: z.string().optional(),
});

export type AiCampaignInput = z.infer<typeof aiCampaignInputSchema>;

export interface CampaignPhase {
  phaseNumber: number;
  name: string; // e.g. "Awareness", "Education", "Trust", "Conversion", "Follow-up"
  focus: string;
  objective: string;
  duration: string;
}

export interface CampaignTopicOpportunity {
  topic: string;
  pillar: string;
  recommendedPlatform: string;
  recommendedFormat: string;
  hook: string;
  cta: string;
  selected?: boolean;
}

export interface AiCampaignOutput {
  id?: string;
  name: string;
  positioning: string;
  coreMessage: string;
  contentPillars: string[];
  phases: CampaignPhase[];
  topics: CampaignTopicOpportunity[];
  platformAdaptations: {
    platform: string;
    contentStyle: string;
    recommendedFormats: string[];
    ctaFormat: string;
  }[];
  ctaStrategy: string;
  suggestedPostingFrequency: string;
}
