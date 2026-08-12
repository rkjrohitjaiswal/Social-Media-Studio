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

export class FacebookAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "FACEBOOK" as const;

  async getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> {
    if (!accessToken || accessToken.startsWith("mock-")) {
      return {
        available: false,
        message:
          "Facebook Page insights require 'pages_read_engagement' permission approval from the Meta Developer Portal.",
      };
    }

    try {
      const version = process.env.FACEBOOK_API_VERSION || "v25.0";
      const url = `https://graph.facebook.com/${version}/${externalPostId}/insights?metric=post_impressions_unique,post_clicks,post_reactions_by_type_total&access_token=${accessToken}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        return {
          available: false,
          message:
            "Facebook Page insights require 'pages_read_engagement' permission approval from the Meta Developer Portal.",
        };
      }

      const payload = (await res.json()) as { data?: Array<{ name: string; values: Array<{ value: number | Record<string, number> }> }> };
      const getVal = (name: string): number => {
        const item = payload.data?.find((d) => d.name === name);
        const val = item?.values?.[0]?.value;
        if (typeof val === "number") return val;
        if (typeof val === "object" && val !== null) {
          return Object.values(val).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
        }
        return 0;
      };

      const reach = getVal("post_impressions_unique");
      const clicks = getVal("post_clicks");
      const reactions = getVal("post_reactions_by_type_total");
      const engagements = clicks + reactions;

      return {
        available: true,
        metrics: {
          impressions: reach,
          reach,
          likes: reactions,
          comments: 0,
          shares: clicks,
          saves: 0,
          engagements,
          engagementRate: reach > 0 ? (engagements / reach) * 100 : 0,
        },
      };
    } catch {
      return {
        available: false,
        message:
          "Facebook Page insights require 'pages_read_engagement' permission approval from the Meta Developer Portal.",
      };
    }
  }
}

export class TikTokAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "TIKTOK" as const;

  async getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> {
    if (!accessToken || accessToken.startsWith("mock-")) {
      return {
        available: false,
        message:
          "TikTok Video Analytics requires 'video.list' scope approval from the TikTok Developer Portal.",
      };
    }

    try {
      const url = `https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filters: { video_ids: [externalPostId] } }),
        cache: "no-store",
      });

      if (!res.ok) {
        return {
          available: false,
          message:
            "TikTok Video Analytics requires 'video.list' scope approval from the TikTok Developer Portal.",
        };
      }

      const payload = (await res.json()) as {
        data?: { videos?: Array<{ view_count?: number; like_count?: number; comment_count?: number; share_count?: number }> };
      };
      const v = payload.data?.videos?.[0] || {};
      const views = v.view_count || 0;
      const likes = v.like_count || 0;
      const comments = v.comment_count || 0;
      const shares = v.share_count || 0;
      const engagements = likes + comments + shares;

      return {
        available: true,
        metrics: {
          impressions: views,
          reach: views,
          likes,
          comments,
          shares,
          saves: 0,
          engagements,
          engagementRate: views > 0 ? (engagements / views) * 100 : 0,
        },
      };
    } catch {
      return {
        available: false,
        message:
          "TikTok Video Analytics requires 'video.list' scope approval from the TikTok Developer Portal.",
      };
    }
  }
}

export class YouTubeAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "YOUTUBE" as const;

  async getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> {
    if (!accessToken || accessToken.startsWith("mock-")) {
      return {
        available: false,
        message:
          "YouTube Video Analytics requires 'youtube.readonly' scope and Google API credentials.",
      };
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${externalPostId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!res.ok) {
        return {
          available: false,
          message:
            "YouTube Video Analytics requires 'youtube.readonly' scope and Google API credentials.",
        };
      }

      const payload = (await res.json()) as {
        items?: Array<{ statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }>;
      };
      const stats = payload.items?.[0]?.statistics || {};
      const views = parseInt(stats.viewCount || "0", 10);
      const likes = parseInt(stats.likeCount || "0", 10);
      const comments = parseInt(stats.commentCount || "0", 10);
      const engagements = likes + comments;

      return {
        available: true,
        metrics: {
          impressions: views,
          reach: views,
          likes,
          comments,
          shares: 0,
          saves: 0,
          engagements,
          engagementRate: views > 0 ? (engagements / views) * 100 : 0,
        },
      };
    } catch {
      return {
        available: false,
        message:
          "YouTube Video Analytics requires 'youtube.readonly' scope and Google API credentials.",
      };
    }
  }
}

export class XAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "X" as const;

  async getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> {
    if (!accessToken || accessToken.startsWith("mock-")) {
      return {
        available: false,
        message:
          "X (Twitter) analytics requires 'tweet.read' scope and X API v2 credentials.",
      };
    }

    try {
      const url = `https://api.x.com/2/tweets/${externalPostId}?tweet.fields=public_metrics,non_public_metrics,organic_metrics`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!res.ok) {
        return {
          available: false,
          message:
            "X (Twitter) analytics requires 'tweet.read' scope and X API v2 credentials.",
        };
      }

      const payload = (await res.json()) as {
        data?: {
          public_metrics?: {
            retweet_count?: number;
            reply_count?: number;
            like_count?: number;
            quote_count?: number;
            bookmark_count?: number;
            impression_count?: number;
          };
          organic_metrics?: {
            impression_count?: number;
            like_count?: number;
            reply_count?: number;
            retweet_count?: number;
          };
        };
      };

      const pm = payload.data?.public_metrics || {};
      const om = payload.data?.organic_metrics || {};

      const impressions = pm.impression_count || om.impression_count || 0;
      const likes = pm.like_count || om.like_count || 0;
      const comments = pm.reply_count || om.reply_count || 0;
      const retweets = pm.retweet_count || om.retweet_count || 0;
      const quotes = pm.quote_count || 0;
      const shares = retweets + quotes;
      const saves = pm.bookmark_count || 0;
      const totalEngagements = likes + comments + shares + saves;

      return {
        available: true,
        metrics: {
          impressions,
          reach: impressions,
          likes,
          comments,
          shares,
          saves,
          engagements: totalEngagements,
          engagementRate: impressions > 0 ? (totalEngagements / impressions) * 100 : 0,
        },
      };
    } catch {
      return {
        available: false,
        message:
          "X (Twitter) analytics requires 'tweet.read' scope and X API v2 credentials.",
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
    this.providers.set("FACEBOOK", new FacebookAnalyticsAdapter());
    this.providers.set("TIKTOK", new TikTokAnalyticsAdapter());
    this.providers.set("YOUTUBE", new YouTubeAnalyticsAdapter());
    this.providers.set("X", new XAnalyticsAdapter());
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
