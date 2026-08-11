import { SocialPlatform } from "./types";
import { MetaInstagramAnalyticsProvider } from "../instagram/analytics-provider";

export interface PlatformAnalyticsMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagements: number;
  engagementRate: number;
}

export interface AnalyticsResponse {
  available: boolean;
  message?: string;
  metrics?: PlatformAnalyticsMetrics;
}

export interface SocialPlatformAnalyticsProvider {
  platform: SocialPlatform;
  getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse>;
}

export class InstagramAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "INSTAGRAM" as const;
  private igAnalytics = new MetaInstagramAnalyticsProvider();

  async getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> {
    try {
      const raw = await this.igAnalytics.getMediaInsights(
        accessToken || "mock-token",
        externalPostId
      );

      return {
        available: true,
        metrics: {
          impressions: raw.impressions,
          reach: raw.reach,
          likes: raw.likes,
          comments: raw.comments,
          shares: raw.shares,
          saves: raw.saves,
          engagements: raw.engagements,
          engagementRate: raw.engagementRate,
        },
      };
    } catch {
      return {
        available: false,
        message: "Failed to fetch Instagram analytics.",
      };
    }
  }
}

export class GenericUnsupportedAnalyticsProvider implements SocialPlatformAnalyticsProvider {
  readonly platform: SocialPlatform;

  constructor(platform: SocialPlatform) {
    this.platform = platform;
  }

  async getMediaAnalytics(): Promise<AnalyticsResponse> {
    return {
      available: false,
      message: `Analytics unavailable for ${this.platform}.`,
    };
  }
}

export class UniversalAnalyticsProvider {
  private providers: Map<SocialPlatform, SocialPlatformAnalyticsProvider> = new Map();

  constructor() {
    this.providers.set("INSTAGRAM", new InstagramAnalyticsAdapter());
  }

  getProvider(platform: SocialPlatform): SocialPlatformAnalyticsProvider {
    return this.providers.get(platform) || new GenericUnsupportedAnalyticsProvider(platform);
  }

  async fetchAnalytics(platform: SocialPlatform, externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> {
    const provider = this.getProvider(platform);
    return provider.getMediaAnalytics(externalPostId, accessToken);
  }
}

export const universalAnalyticsProvider = new UniversalAnalyticsProvider();
