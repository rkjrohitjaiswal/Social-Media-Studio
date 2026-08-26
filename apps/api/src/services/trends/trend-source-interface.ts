import {
  NormalizedTrend,
  TrendQueryFilterInput,
  TrendSourceState,
} from "@ai-social/shared";

export interface ITrendSource {
  providerName: string;
  isConfigured(): boolean;
  getSourceState(): TrendSourceState;
  getTrendingTopics(filters?: TrendQueryFilterInput): Promise<NormalizedTrend[]>;
  searchTrends(query: string, filters?: TrendQueryFilterInput): Promise<NormalizedTrend[]>;
  getTrendDetails(trendId: string): Promise<NormalizedTrend | null>;
}
