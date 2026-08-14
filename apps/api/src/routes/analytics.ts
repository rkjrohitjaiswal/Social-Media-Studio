import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth as any);

analyticsRouter.get("/overview", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      totalImpressions: 142500,
      totalReach: 98200,
      totalEngagements: 12400,
      averageEngagementRate: 8.68,
      followerGrowth: 1450,
      topPerformingPlatform: "INSTAGRAM",
    },
  });
});

analyticsRouter.get("/media", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: "media-1",
        platform: "INSTAGRAM",
        impressions: 24500,
        reach: 18200,
        likes: 1840,
        comments: 142,
        saves: 380,
        shares: 210,
        engagementRate: 10.2,
        publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        permalink: "https://instagram.com/p/demo1",
      },
      {
        id: "media-2",
        platform: "LINKEDIN",
        impressions: 18900,
        reach: 14100,
        likes: 920,
        comments: 86,
        saves: 120,
        shares: 95,
        engagementRate: 6.4,
        publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        permalink: "https://linkedin.com/posts/demo2",
      },
    ],
  });
});

analyticsRouter.get("/media/:mediaId", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      id: req.params.mediaId,
      platform: "INSTAGRAM",
      impressions: 24500,
      reach: 18200,
      likes: 1840,
      comments: 142,
      saves: 380,
      shares: 210,
      engagementRate: 10.2,
    },
  });
});

analyticsRouter.get("/campaigns", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        campaignId: "demo-campaign-1",
        campaignName: "Summer Minimalist Collection 2026",
        totalPosts: 8,
        totalImpressions: 98400,
        averageEngagementRate: 8.9,
      },
    ],
  });
});

analyticsRouter.get("/timeseries", (req: AuthenticatedRequest, res: Response) => {
  const dates = [];
  const now = Date.now();
  for (let i = 14; i >= 0; i--) {
    dates.push({
      date: new Date(now - i * 86400000).toISOString().split("T")[0],
      impressions: Math.floor(5000 + Math.random() * 3000),
      engagements: Math.floor(400 + Math.random() * 300),
    });
  }
  res.json({ success: true, data: dates });
});
