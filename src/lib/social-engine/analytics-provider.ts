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

export class LinkedInAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "LINKEDIN" as const;

  async getMediaAnalytics(): Promise<AnalyticsResponse> {
    return {
      available: false,
      message:
        "LinkedIn analytics requires 'r_organization_social' or 'r_member_social_analytics' permission approval from the LinkedIn Developer Portal.",
    };
  }
}

export class ThreadsAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "THREADS" as const;

  async getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> {
    if (!accessToken || accessToken.startsWith("mock-")) {
      return {
        available: false,
        message:
          "Threads analytics requires 'threads_manage_insights' permission approval from Meta Developer Portal.",
      };
    }

    try {
      const version = process.env.THREADS_API_VERSION || "v1.0";
      const url = `https://graph.threads.net/${version}/${externalPostId}/threads_insights?metric=views,likes,replies,reposts,quotes&access_token=${accessToken}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        return {
          available: false,
          message:
            "Threads analytics requires 'threads_manage_insights' permission approval from Meta Developer Portal.",
        };
      }

      const payload = (await res.json()) as { data?: Array<{ name: string; values: Array<{ value: number }> }> };
      const getVal = (name: string) => payload.data?.find((d) => d.name === name)?.values?.[0]?.value || 0;

      const views = getVal("views");
      const likes = getVal("likes");
      const comments = getVal("replies");
      const shares = getVal("reposts") + getVal("quotes");
      const totalEngagements = likes + comments + shares;

      return {
        available: true,
        metrics: {
          impressions: views,
          reach: views,
          likes,
          comments,
          shares,
          saves: 0,
          engagements: totalEngagements,
          engagementRate: views > 0 ? (totalEngagements / views) * 100 : 0,
        },
      };
    } catch {
      return {
        available: false,
        message:
          "Threads analytics requires 'threads_manage_insights' permission approval from Meta Developer Portal.",
      };
    }
  }
}

export class PinterestAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "PINTEREST" as const;

  async getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> {
    if (!accessToken || accessToken.startsWith("mock-")) {
      return {
        available: false,
        message:
          "Pinterest analytics requires 'pins:read' scope approval from the Pinterest Developer Console.",
      };
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString().split("T")[0];
      const url = `https://api.pinterest.com/v5/pins/${externalPostId}/analytics?start_date=${monthAgo}&end_date=${today}&metric_types=IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!res.ok) {
        return {
          available: false,
          message:
            "Pinterest analytics requires 'pins:read' scope approval from the Pinterest Developer Console.",
        };
      }

      const payload = (await res.json()) as { all?: { summary_metrics?: Record<string, number> } };
      const metrics = payload.all?.summary_metrics || {};

      const impressions = metrics.IMPRESSION || 0;
      const clicks = (metrics.PIN_CLICK || 0) + (metrics.OUTBOUND_CLICK || 0);
      const saves = metrics.SAVE || 0;
      const totalEngagements = clicks + saves;

      return {
        available: true,
        metrics: {
          impressions,
          reach: impressions,
          likes: 0,
          comments: 0,
          shares: clicks,
          saves,
          engagements: totalEngagements,
          engagementRate: impressions > 0 ? (totalEngagements / impressions) * 100 : 0,
        },
      };
    } catch {
      return {
        available: false,
        message:
          "Pinterest analytics requires 'pins:read' scope approval from the Pinterest Developer Console.",
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
    this.providers.set("LINKEDIN", new LinkedInAnalyticsAdapter());
    this.providers.set("THREADS", new ThreadsAnalyticsAdapter());
    this.providers.set("PINTEREST", new PinterestAnalyticsAdapter());
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
