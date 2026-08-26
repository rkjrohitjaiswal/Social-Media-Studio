import { z } from "zod";

export const trendLifecycleEnum = z.enum(["EMERGING", "GROWING", "PEAK", "DECLINING", "UNKNOWN"]);
export type TrendLifecycle = z.infer<typeof trendLifecycleEnum>;

export const trendStatusEnum = z.enum(["EMERGING", "GROWING", "STABLE", "DECLINING", "UNKNOWN"]);
export type TrendStatus = z.infer<typeof trendStatusEnum>;

export const trendQueryFilterSchema = z.object({
  query: z.string().optional(),
  platform: z.string().optional(),
  category: z.string().optional(),
  trendStatus: trendStatusEnum.optional(),
  region: z.string().optional().default("GLOBAL"),
  limit: z.number().optional().default(10),
});

export type TrendQueryFilterInput = z.infer<typeof trendQueryFilterSchema>;

export interface TrendSourceState {
  isConnected: boolean;
  providerName: string;
  statusMessage: string;
  availableCategories: string[];
}

export interface NormalizedTrend {
  id: string;
  title: string;
  description: string;
  category: string;
  platform: string;
  region: string;
  source: string;
  sourceUrl?: string;
  detectedAt: string;
  observedAt?: string;
  trendStatus: TrendStatus;
  trendScore?: number;
  lifecycle?: TrendLifecycle;
  relevanceScore?: number;
  opportunityScore?: number;
  sourceData?: Record<string, any>;
}

export interface TrendOpportunity {
  id: string;
  trendId: string;
  trendScore: number;
  lifecycle: TrendLifecycle;
  relevanceScore: number;
  opportunityScore: number;
  recommendedAngle: string;
  recommendedPlatform: string;
  recommendedFormat: string;
  recommendedCta: string;
  contentPillarName?: string;
  what: string;
  why: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  dataBasis: string[];
}

export interface DetailedTrendResponse {
  trend: NormalizedTrend;
  sourceState: TrendSourceState;
  opportunity?: TrendOpportunity;
}
