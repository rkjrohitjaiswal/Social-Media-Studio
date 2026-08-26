import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import {
  topPerformingFilterSchema,
  performanceAnalysisInputSchema,
  createMoreLikeThisInputSchema,
} from "@ai-social/shared";
import {
  getTopPerformingContent,
  analyzeContentPerformance,
  detectContentPatterns,
  generateCreateMoreLikeThisVariations,
  calculateBestPostingTimes,
  getAiNextContentRecommendations,
} from "../services/performance-service.js";
import { checkUsageAccess, consumeUsage } from "../services/usage-service.js";

import {
  getWorkspaceAnalyticsOverview,
  getWorkspaceMediaAnalytics,
} from "../services/analytics-service.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth as any);

// GET /api/analytics/overview -> Fetch real workspace-scoped analytics overview
analyticsRouter.get("/overview", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "demo-workspace-1";
    const userId = req.user!.id;
    const overview = await getWorkspaceAnalyticsOverview(workspaceId, userId);
    return res.json({
      success: true,
      data: overview,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch analytics overview" });
  }
});

// GET /api/analytics/media -> Fetch real workspace-scoped published media analytics
analyticsRouter.get("/media", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "demo-workspace-1";
    const userId = req.user!.id;
    const media = await getWorkspaceMediaAnalytics(workspaceId, userId);
    return res.json({
      success: true,
      data: media,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch media analytics" });
  }
});

// GET /api/analytics/top-performing -> Filter & Sort Top Performing Content by available real metrics
analyticsRouter.get("/top-performing", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = topPerformingFilterSchema.safeParse(req.query);

    const sortBy = parse.success ? parse.data.sortBy : (req.query.sortBy as string) || "engagement";
    const platform = parse.success ? parse.data.platform : (req.query.platform as string);
    const limit = parse.success ? parse.data.limit : 10;

    const report = await getTopPerformingContent(userId, sortBy, platform, limit);
    return res.json({
      success: true,
      data: report,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch top performing content" });
  }
});

// POST /api/analytics/performance-analysis -> Explainable AI Performance Analysis for selected content
analyticsRouter.post("/performance-analysis", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = performanceAnalysisInputSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid media ID payload", details: parse.error.format() });
    }

    const analysis = await analyzeContentPerformance(userId, parse.data.mediaId);
    return res.json({
      success: true,
      data: analysis,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to analyze content performance";
    const status = msg.includes("not found") ? 404 : msg.includes("Unauthorized") ? 403 : 500;
    return res.status(status).json({ error: msg });
  }
});

// GET /api/analytics/patterns -> Detect successful patterns across user's historical content
analyticsRouter.get("/patterns", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const patterns = await detectContentPatterns(userId);
    return res.json({
      success: true,
      data: patterns,
    });
  } catch {
    return res.status(500).json({ error: "Failed to detect content patterns" });
  }
});

// POST /api/analytics/create-more-like-this -> Generate variations of high-performing content (1 Credit)
analyticsRouter.post("/create-more-like-this", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = createMoreLikeThisInputSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid create-more-like-this payload", details: parse.error.format() });
    }

    // Check credits
    const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    if (!access.allowed) {
      return res.status(402).json({
        code: access.code || "USAGE_LIMIT_REACHED",
        error: access.message || "Your free usage credits have been finished. Upgrade your plan to continue.",
      });
    }

    const { sourceMediaId, variationsCount, targetPlatform, targetContentType } = parse.data;

    // Deduct 1 credit server-side
    await consumeUsage(userId, "CONTENT_GENERATION");

    const result = await generateCreateMoreLikeThisVariations(
      userId,
      sourceMediaId,
      variationsCount,
      targetPlatform,
      targetContentType
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch {
    return res.status(500).json({ error: "Failed to generate variations" });
  }
});

// GET /api/analytics/best-posting-time -> Account-specific posting time recommendations
analyticsRouter.get("/best-posting-time", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const report = await calculateBestPostingTimes(userId);
    return res.json({
      success: true,
      data: report,
    });
  } catch {
    return res.status(500).json({ error: "Failed to calculate best posting time" });
  }
});

// GET /api/analytics/next-content -> AI Next Content recommendations
analyticsRouter.get("/next-content", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const recommendations = await getAiNextContentRecommendations(userId);
    return res.json({
      success: true,
      data: recommendations,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch AI next content recommendations" });
  }
});

analyticsRouter.get("/media/:mediaId", async (req: AuthenticatedRequest, res: Response) => {
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

analyticsRouter.get("/campaigns", async (req: AuthenticatedRequest, res: Response) => {
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

analyticsRouter.get("/timeseries", async (req: AuthenticatedRequest, res: Response) => {
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
