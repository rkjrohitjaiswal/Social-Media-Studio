import { ITrendSource } from "./trend-source-interface.js";
import {
  NormalizedTrend,
  TrendQueryFilterInput,
  TrendSourceState,
} from "@ai-social/shared";

export class NullTrendProvider implements ITrendSource {
  public providerName = "Unconnected Provider";

  public isConfigured(): boolean {
    return false;
  }

  public getSourceState(): TrendSourceState {
    return {
      isConnected: false,
      providerName: this.providerName,
      statusMessage: "Live trend intelligence is not connected yet.",
      availableCategories: ["Technology", "Business", "Marketing", "Design", "AI & Automation"],
    };
  }

  public async getTrendingTopics(): Promise<NormalizedTrend[]> {
    // Strictly return empty list when no live provider is connected
    return [];
  }

  public async searchTrends(): Promise<NormalizedTrend[]> {
    // Strictly return empty list when no live provider is connected
    return [];
  }

  public async getTrendDetails(): Promise<NormalizedTrend | null> {
    return null;
  }
}
