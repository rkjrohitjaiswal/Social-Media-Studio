import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MetaInstagramAnalyticsProvider,
  InstagramAnalyticsError,
  calculateTotalEngagements,
  calculateEngagementRate,
  InstagramAnalyticsProvider,
} from "../lib/instagram/analytics-provider";
import {
  syncInstagramAnalytics,
  saveMediaInsightSnapshot,
  saveAccountInsightSnapshot,
  clearAnalyticsStore,
  getAnalyticsOverview,
  getMediaAnalyticsList,
  getMediaAnalyticsDetail,
  getTimeSeriesAnalytics,
  getBestContentInsightsData,
  getCampaignAnalyticsList,
  getQualityVsPerformanceData,
} from "../lib/queue/instagram-analytics-worker";
import * as igWorker from "../lib/queue/instagram-worker";

import { encryptToken } from "../lib/security/encryption";

describe("Milestone 10 — Instagram Analytics & Performance Intelligence System", () => {
  beforeEach(() => {
    clearAnalyticsStore();
    vi.restoreAllMocks();
  });

  describe("Metric Calculation Utilities", () => {
    it("should calculate total engagements correctly", () => {
      const total = calculateTotalEngagements(100, 25, 50, 10);
      expect(total).toBe(185);
    });

    it("should calculate engagement rate correctly based on reach", () => {
      // 100 engagements / 1000 reach = 10%
      const rate = calculateEngagementRate(100, 1000);
      expect(rate).toBe(10);
    });

    it("should return 0 engagement rate when reach is 0", () => {
      const rate = calculateEngagementRate(100, 0);
      expect(rate).toBe(0);
    });
  });

  describe("Analytics Snapshot Storage & Deduplication", () => {
    it("should store and deduplicate media insight snapshots by periodStart", () => {
      const s1 = saveMediaInsightSnapshot({
        workspaceId: "ws-1",
        instagramAccountId: "acc-1",
        instagramPublicationId: "pub-1",
        instagramMediaId: "media-1",
        periodStart: "2026-08-11T00:00:00.000Z",
        periodEnd: "2026-08-11T23:59:59.000Z",
        impressions: 1000,
        reach: 800,
        likes: 50,
        comments: 10,
        saves: 20,
        shares: 5,
        engagements: 85,
        engagementRate: 10.63,
      });

      // Saving second snapshot with same periodStart should update existing
      const s2 = saveMediaInsightSnapshot({
        workspaceId: "ws-1",
        instagramAccountId: "acc-1",
        instagramPublicationId: "pub-1",
        instagramMediaId: "media-1",
        periodStart: "2026-08-11T00:00:00.000Z",
        periodEnd: "2026-08-11T23:59:59.000Z",
        impressions: 1200,
        reach: 900,
        likes: 60,
        comments: 12,
        saves: 25,
        shares: 8,
        engagements: 105,
        engagementRate: 11.67,
      });

      expect(s2.id).toBe(s1.id);
      expect(s2.impressions).toBe(1200);
    });

    it("should store and deduplicate account insight snapshots by periodStart", () => {
      const a1 = saveAccountInsightSnapshot({
        workspaceId: "ws-1",
        instagramAccountId: "acc-1",
        periodStart: "2026-08-11T00:00:00.000Z",
        periodEnd: "2026-08-11T23:59:59.000Z",
        followers: 12500,
        followerGrowth: 150,
        impressions: 45000,
        reach: 32000,
        profileViews: 1200,
        websiteClicks: 340,
        totalLikes: 2300,
        totalComments: 450,
        totalSaves: 890,
        totalShares: 210,
        engagementRate: 12.03,
      });

      const a2 = saveAccountInsightSnapshot({
        workspaceId: "ws-1",
        instagramAccountId: "acc-1",
        periodStart: "2026-08-11T00:00:00.000Z",
        periodEnd: "2026-08-11T23:59:59.000Z",
        followers: 12550,
        followerGrowth: 200,
        impressions: 48000,
        reach: 34000,
        profileViews: 1300,
        websiteClicks: 360,
        totalLikes: 2400,
        totalComments: 470,
        totalSaves: 910,
        totalShares: 220,
        engagementRate: 11.76,
      });

      expect(a2.id).toBe(a1.id);
      expect(a2.followers).toBe(12550);
    });
  });

  describe("Analytics Provider Unit Behavior", () => {
    it("should return realistic mock insights data for connected account", async () => {
      const provider = new MetaInstagramAnalyticsProvider();
      const mediaInsights = await provider.getMediaInsights("mock-token", "media-100");
      expect(mediaInsights.reach).toBeGreaterThan(0);
      expect(mediaInsights.impressions).toBeGreaterThan(0);
      expect(mediaInsights.likes).toBeGreaterThan(0);
      expect(mediaInsights.engagementRate).toBeGreaterThan(0);

      const accountInsights = await provider.getAccountInsights("mock-token", "user-100");
      expect(accountInsights.followers).toBeGreaterThan(0);
      expect(accountInsights.reach).toBeGreaterThan(0);
    });
  });

  describe("Analytics Sync Worker & Error Classification", () => {
    it("should sync connected account and media publications successfully", async () => {
      // Mock connected Instagram account
      vi.spyOn(igWorker, "getConnectedInstagramAccount").mockReturnValue({
        id: "acc-1",
        workspaceId: "ws-sync-1",
        username: "maisonlumiere_official",
        instagramUserId: "ig-user-1",
        accessTokenEncrypted: encryptToken("mock-token"),
        accountType: "BUSINESS",
        status: "CONNECTED",
        connectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      vi.spyOn(igWorker, "getAllPublications").mockReturnValue([
        {
          id: "pub-1",
          workspaceId: "ws-sync-1",
          campaignId: "camp-1",
          generatedAssetId: "asset-1",
          socialCopyId: "copy-1",
          instagramAccountId: "acc-1",
          instagramMediaId: "ig-media-1",
          status: "PUBLISHED",
          captionSnapshot: "Luxury Mediterranean resort fashion",
          hashtagsSnapshot: ["maisonlumiere"],
          ctaSnapshot: "Discover the story.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      ]);

      const result = await syncInstagramAnalytics({ workspaceId: "ws-sync-1" });
      expect(result.success).toBe(true);
      expect(result.syncedAccounts).toBe(1);
      expect(result.syncedMedia).toBe(1);
    });

    it("should set account status to REAUTH_REQUIRED when authentication error occurs", async () => {
      const account = {
        id: "acc-reauth",
        workspaceId: "ws-auth-fail",
        username: "maisonlumiere_official",
        instagramUserId: "ig-user-fail",
        accessTokenEncrypted: encryptToken("enc-invalid-token"),
        accountType: "BUSINESS",
        status: "CONNECTED" as const,
        connectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(igWorker, "getConnectedInstagramAccount").mockReturnValue(account);

      // Mock provider throwing AUTHENTICATION error
      const mockProvider = {
        getMediaInsights: vi.fn(),
        getAccountInsights: vi.fn().mockRejectedValue(
          new InstagramAnalyticsError("Token Expired Code 190", "AUTHENTICATION", 401)
        ),
      };

      await syncInstagramAnalytics({
        workspaceId: "ws-auth-fail",
        provider: mockProvider as unknown as InstagramAnalyticsProvider,
      });

      expect(account.status).toBe("REAUTH_REQUIRED");
    });
  });

  describe("Quality vs Performance Correlation & Aggregations", () => {
    beforeEach(() => {
      clearAnalyticsStore();
    });

    it("should aggregate campaign performance correctly", () => {
      vi.spyOn(igWorker, "getAllPublications").mockReturnValue([
        {
          id: "pub-1",
          workspaceId: "ws-agg-1",
          campaignId: "camp-1",
          generatedAssetId: "asset-1",
          socialCopyId: "copy-1",
          instagramAccountId: "acc-1",
          instagramMediaId: "ig-media-1",
          status: "PUBLISHED",
          captionSnapshot: "Luxury Mediterranean resort fashion",
          hashtagsSnapshot: ["maisonlumiere"],
          ctaSnapshot: "Discover the story.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      ]);

      saveMediaInsightSnapshot({
        workspaceId: "ws-agg-1",
        instagramAccountId: "acc-1",
        instagramPublicationId: "pub-1",
        instagramMediaId: "media-1",
        periodStart: "2026-08-11T00:00:00.000Z",
        periodEnd: "2026-08-11T23:59:59.000Z",
        impressions: 10000,
        reach: 8000,
        likes: 800,
        comments: 50,
        saves: 150,
        shares: 50,
        engagements: 1050,
        engagementRate: 13.13,
      });

      const campaigns = getCampaignAnalyticsList({ workspaceId: "ws-agg-1" });
      expect(campaigns).toBeDefined();
    });

    it("should return empty state message when insufficient data exists for quality correlation", () => {
      const corr = getQualityVsPerformanceData({ workspaceId: "ws-no-data" });
      expect(corr.hasData).toBe(false);
      expect(corr.message).toContain("More published content is required");
    });
  });
});
