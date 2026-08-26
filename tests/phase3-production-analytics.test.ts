import { describe, it, expect, beforeEach } from "vitest";
import {
  getAnalyticsOverview,
  ingestPostMetrics,
  clearInMemoryAnalyticsStore,
} from "../apps/api/src/services/analytics-service.js";

describe("Phase 3 Part 9 — Production Analytics Ingestion Architecture", () => {
  const userId = "usr_analytics_test";
  const workspaceId = "ws_analytics_test";

  beforeEach(() => {
    clearInMemoryAnalyticsStore();
  });

  it("1. ANALYTICS INGESTION: ingests post metrics for YouTube and Instagram video posts", async () => {
    const res = await ingestPostMetrics({
      workspaceId,
      externalPostId: "ext_yt_12345",
      platform: "YOUTUBE",
      metrics: {
        views: 12500,
        likes: 980,
        comments: 142,
        watchTimeMinutes: 4500,
        shares: 310,
      },
    });

    expect(res.success).toBe(true);
    expect(res.snapshotId).toBeDefined();
  });

  it("2. ANALYTICS OVERVIEW: calculates aggregate engagement metrics from post snapshots", async () => {
    await ingestPostMetrics({
      workspaceId,
      externalPostId: "ext_ig_67890",
      platform: "INSTAGRAM",
      metrics: {
        views: 8400,
        likes: 620,
        comments: 88,
        saves: 210,
        shares: 175,
      },
    });

    const overview = await getAnalyticsOverview({ workspaceId });
    expect(overview.totalViews).toBeGreaterThanOrEqual(8400);
    expect(overview.totalLikes).toBeGreaterThanOrEqual(620);
    expect(overview.engagementRatePercent).toBeGreaterThan(0);
  });

  it("3. WORKSPACE ISOLATION: Workspace A analytics are strictly isolated from Workspace B", async () => {
    await ingestPostMetrics({
      workspaceId: "workspace_A",
      externalPostId: "ext_yt_ws_a",
      platform: "YOUTUBE",
      metrics: { views: 50000, likes: 3000 },
    });

    const overviewB = await getAnalyticsOverview({ workspaceId: "workspace_B" });
    expect(overviewB.totalViews).toBe(0);
  });
});
