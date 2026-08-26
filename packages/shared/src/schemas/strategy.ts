import { z } from "zod";

export const strategyInputSchema = z.object({
  primaryGoal: z.string().min(1, "Primary goal is required"),
  targetAudience: z.string().min(1, "Target audience is required"),
  industry: z.string().optional(),
  brandName: z.string().optional(),
  platforms: z.array(z.string()).min(1, "At least one platform must be selected"),
  postingFrequency: z.string().default("3-4 posts per week"),
  contentPreferences: z.string().optional(),
  campaignInfo: z.string().optional(),
  analyticsContext: z.string().optional(),
});

export type StrategyInput = z.infer<typeof strategyInputSchema>;

export interface ExplainableRecommendation {
  what: string;
  why: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  dataBasis: string[];
}

export interface PlatformStrategyItem {
  platform: string;
  recommendedFormats: string[];
  contentStyle: string;
  frequency: string;
  ctaStrategy: string;
  adaptationNotes: string;
}

export interface GeneratedStrategyOutput {
  audience: {
    targetAudience: string;
    painPoints: string[];
    interests: string[];
    contentIntent: string[];
  };
  positioning: {
    brandAngle: string;
    valueProposition: string;
    differentiation: string;
  };
  contentPillars: {
    name: string;
    description: string;
    purpose: string;
    recommendedPercentage: number;
    color: string;
    icon: string;
  }[];
  contentMix: {
    category: string;
    percentage: number;
    rationale: string;
  }[];
  platformStrategy: PlatformStrategyItem[];
  recommendations: ExplainableRecommendation[];
}

// CONTENT PILLARS SCHEMAS
export const contentPillarSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Pillar name is required"),
  description: z.string().min(1, "Description is required"),
  purpose: z.string().optional(),
  targetAudience: z.string().optional(),
  recommendedPlatforms: z.array(z.string()).default([]),
  contentTypes: z.array(z.string()).default([]),
  percentageAllocation: z.number().min(0).max(100).default(20),
  color: z.string().default("#c5a059"),
  icon: z.string().default("Layers"),
  isActive: z.boolean().default(true),
  orderIndex: z.number().default(0),
});

export type ContentPillarInput = z.infer<typeof contentPillarSchema>;

// CONTENT PLAN SCHEMAS
export const generatePlanInputSchema = z.object({
  planType: z.enum(["SEVEN_DAY", "THIRTY_DAY"]).default("THIRTY_DAY"),
  startDate: z.string().optional(),
  platforms: z.array(z.string()).min(1),
  postingFrequency: z.string().default("Daily"),
  campaignId: z.string().optional(),
  pillarIds: z.array(z.string()).optional(),
});

export type GeneratePlanInput = z.infer<typeof generatePlanInputSchema>;

export interface CalendarEntryItem {
  id?: string;
  date: string;
  dayNumber?: number;
  weekNumber?: number;
  platform: string;
  contentType: string;
  pillarName: string;
  topic: string;
  hook: string;
  objective: string;
  cta: string;
  suggestedPostingTime: string;
  status: "DRAFT" | "READY" | "APPROVED" | "SCHEDULED" | "PUBLISHED";
  aiRationale: string;
}

export interface ContentPlanOutput {
  id?: string;
  title: string;
  planType: "SEVEN_DAY" | "THIRTY_DAY";
  startDate: string;
  endDate: string;
  weeklyThemes: { weekNumber: number; theme: string; focus: string }[];
  items: CalendarEntryItem[];
}
