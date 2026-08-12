import { SocialPlatform } from "./types";
import { MetaInstagramAnalyticsProvider } from "../instagram/analytics-provider";

export interface PlatformAnalyticsMetrics { impressions: number; reach: number; likes: number; comments: number; shares: number; saves: number; engagements: number; engagementRate: number; }
export interface AnalyticsResponse { available: boolean; message?: string; metrics?: PlatformAnalyticsMetrics; }
export interface SocialPlatformAnalyticsProvider { platform: SocialPlatform; getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse>; }

export class InstagramAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "INSTAGRAM" as const; private igAnalytics = new MetaInstagramAnalyticsProvider();
  async getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> { try { const raw = await this.igAnalytics.getMediaInsights(accessToken || "mock-token", externalPostId); return { available: true, metrics: { impressions: raw.impressions, reach: raw.reach, likes: raw.likes, comments: raw.comments, shares: raw.shares, saves: raw.saves, engagements: raw.engagements, engagementRate: raw.engagementRate } }; } catch { return { available: false, message: "Failed to fetch Instagram analytics." }; } }
}

export class LinkedInAnalyticsAdapter implements SocialPlatformAnalyticsProvider { readonly platform = "LINKEDIN" as const; async getMediaAnalytics(): Promise<AnalyticsResponse> { return { available: false, message: "LinkedIn analytics requires approved member or organization analytics permissions." }; } }
export class ThreadsAnalyticsAdapter implements SocialPlatformAnalyticsProvider { readonly platform = "THREADS" as const; async getMediaAnalytics(): Promise<AnalyticsResponse> { return { available: false, message: "Threads analytics requires Threads insights permission." }; } }
export class PinterestAnalyticsAdapter implements SocialPlatformAnalyticsProvider { readonly platform = "PINTEREST" as const; async getMediaAnalytics(): Promise<AnalyticsResponse> { return { available: false, message: "Pinterest analytics requires pins:read scope approval." }; } }
export class FacebookAnalyticsAdapter implements SocialPlatformAnalyticsProvider { readonly platform = "FACEBOOK" as const; async getMediaAnalytics(): Promise<AnalyticsResponse> { return { available: false, message: "Facebook analytics requires approved Page insights permissions." }; } }
export class TikTokAnalyticsAdapter implements SocialPlatformAnalyticsProvider { readonly platform = "TIKTOK" as const; async getMediaAnalytics(): Promise<AnalyticsResponse> { return { available: false, message: "TikTok analytics requires video.list scope approval." }; } }
export class YouTubeAnalyticsAdapter implements SocialPlatformAnalyticsProvider { readonly platform = "YOUTUBE" as const; async getMediaAnalytics(): Promise<AnalyticsResponse> { return { available: false, message: "YouTube analytics requires youtube.readonly scope and Google API credentials." }; } }

export class XAnalyticsAdapter implements SocialPlatformAnalyticsProvider {
  readonly platform = "X" as const;
  async getMediaAnalytics(externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> {
    if (!accessToken || accessToken.startsWith("mock-")) return { available: false, message: "X analytics requires a user-context access token and an X API plan with post metrics access." };
    try {
      const res = await fetch(`https://api.x.com/2/tweets?ids=${encodeURIComponent(externalPostId)}&tweet.fields=public_metrics`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      if (!res.ok) return { available: false, message: "X post metrics are unavailable for the current API plan or permissions." };
      const payload = (await res.json()) as { data?: Array<{ public_metrics?: { like_count?: number; reply_count?: number; repost_count?: number; quote_count?: number; bookmark_count?: number; impression_count?: number } }> };
      const m = payload.data?.[0]?.public_metrics;
      if (!m) return { available: false, message: "X did not return public metrics for this post." };
      const impressions = m.impression_count || 0;
      const likes = m.like_count || 0;
      const comments = m.reply_count || 0;
      const shares = (m.repost_count || 0) + (m.quote_count || 0);
      const saves = m.bookmark_count || 0;
      const engagements = likes + comments + shares + saves;
      return { available: true, metrics: { impressions, reach: impressions, likes, comments, shares, saves, engagements, engagementRate: impressions > 0 ? (engagements / impressions) * 100 : 0 } };
    } catch { return { available: false, message: "X post metrics are unavailable for the current API plan or permissions." }; }
  }
}

export class GenericUnsupportedAnalyticsProvider implements SocialPlatformAnalyticsProvider { readonly platform: SocialPlatform; constructor(platform: SocialPlatform) { this.platform = platform; } async getMediaAnalytics(): Promise<AnalyticsResponse> { return { available: false, message: `Analytics unavailable for ${this.platform}.` }; } }

export class UniversalAnalyticsProvider {
  private providers: Map<SocialPlatform, SocialPlatformAnalyticsProvider> = new Map();
  constructor() { this.providers.set("INSTAGRAM", new InstagramAnalyticsAdapter()); this.providers.set("LINKEDIN", new LinkedInAnalyticsAdapter()); this.providers.set("THREADS", new ThreadsAnalyticsAdapter()); this.providers.set("PINTEREST", new PinterestAnalyticsAdapter()); this.providers.set("FACEBOOK", new FacebookAnalyticsAdapter()); this.providers.set("TIKTOK", new TikTokAnalyticsAdapter()); this.providers.set("YOUTUBE", new YouTubeAnalyticsAdapter()); this.providers.set("X", new XAnalyticsAdapter()); }
  getProvider(platform: SocialPlatform): SocialPlatformAnalyticsProvider { return this.providers.get(platform) || new GenericUnsupportedAnalyticsProvider(platform); }
  async fetchAnalytics(platform: SocialPlatform, externalPostId: string, accessToken?: string): Promise<AnalyticsResponse> { return this.getProvider(platform).getMediaAnalytics(externalPostId, accessToken); }
}
export const universalAnalyticsProvider = new UniversalAnalyticsProvider();
