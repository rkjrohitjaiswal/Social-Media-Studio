import { z } from "zod";

export const topPerformingFilterSchema = z.object({
  sortBy: z.enum([
    "engagement",
    "reach",
    "impressions",
    "clicks",
    "likes",
    "comments",
    "shares",
    "saves",
    "views",
  ]).default("engagement"),
  platform: z.string().optional(),
  limit: z.number().optional().default(10),
});

export type TopPerformingFilterInput = z.infer<typeof topPerformingFilterSchema>;

export const performanceAnalysisInputSchema = z.object({
  mediaId: z.string().min(1, "Media ID is required"),
});

export type PerformanceAnalysisInput = z.infer<typeof performanceAnalysisInputSchema>;

export const createMoreLikeThisInputSchema = z.object({
  sourceMediaId: z.string().min(1, "Source Media ID is required"),
  variationsCount: z.union([z.literal(3), z.literal(5), z.literal(10)]).default(3),
  targetPlatform: z.string().default("INSTAGRAM"),
  targetContentType: z.string().optional(),
});

export type CreateMoreLikeThisInput = z.infer<typeof createMoreLikeThisInputSchema>;

export interface PerformanceBaseline {
  currentValue: number;
  baselineValue: number;
  relativeResultPercentage: number; // e.g. +74%
  hasSufficientData: boolean;
  message: string;
}

export interface ExplainablePerformanceRecommendation {
  what: string;
  why: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  dataBasis: string[];
}

export interface DetailedPerformanceAnalysis {
  contentId: string;
  topic: string;
  format: string;
  platform: string;
  pillarName: string;
  hook: string;
  cta: string;
  mediaType?: string;
  availableMetrics: Record<string, number>;
  baseline: PerformanceBaseline;
  whatWorked: string[];
  whyItWorked: string[];
  whatToRepeat: string[];
  whatToChange: string[];
  recommendations: ExplainablePerformanceRecommendation[];
}

export interface DetectedContentPattern {
  id?: string;
  dimension: "platform" | "contentType" | "pillar" | "topic" | "hookStyle" | "cta" | "postingTime" | "postingDay" | "mediaType";
  patternObservation: string;
  sampleSize: number;
  performanceMultiplier: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  dataBasis: string[];
}

export interface BestPostingTimeReport {
  platform: string;
  bestDays: string[];
  bestHours: string[];
  hasSufficientData: boolean;
  message: string;
  dataBasis: string[];
}

export interface AiNextContentRecommendation {
  id: string;
  title: string;
  description: string;
  sourceMetric: string;
  actionType: "CREATE_MORE_LIKE_THIS" | "GENERATE_CAROUSEL_IDEAS";
  targetPlatform: string;
  topic: string;
  format: string;
  sourceMediaId?: string;
}
