import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { trendQueryFilterSchema } from "@ai-social/shared";
import {
  getTrendSourceState,
  fetchTrendingTopics,
  searchTrends,
  getDetailedTrendInfo,
  evaluateTrendRelevance,
} from "../services/trends/trend-service.js";
import { checkUsageAccess, consumeUsage } from "../services/usage-service.js";

export const trendsRouter = Router();

trendsRouter.use(requireAuth as any);

// GET /api/trends -> Fetch trending topics or return unconnected provider state (0 credits)
trendsRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = trendQueryFilterSchema.safeParse(req.query);
    const filters = parse.success ? parse.data : undefined;
    const query = req.query.query as string;

    const userId = req.user?.id || "demo-user-id";
    const sourceState = getTrendSourceState();
    const rawTrends = query
      ? await searchTrends(query, filters)
      : await fetchTrendingTopics(filters);

    const enrichedTrends = await Promise.all(
      rawTrends.map(async (t) => {
        try {
          const opp = await evaluateTrendRelevance(userId, t);
          return {
            ...t,
            relevanceScore: opp.relevanceScore,
            opportunityScore: opp.opportunityScore,
          };
        } catch {
          return t;
        }
      })
    );

    return res.json({
      success: true,
      data: {
        hasSource: sourceState.isConnected,
        sourceState,
        trends: enrichedTrends,
      },
    });
  } catch {
    const sourceState = getTrendSourceState();
    return res.json({
      success: true,
      data: {
        hasSource: sourceState.isConnected,
        sourceState,
        trends: [],
      },
    });
  }
});

// GET /api/trends/:id -> Fetch trend details & AI relevance opportunity (0 credits)
trendsRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const trendId = req.params.id;

    const details = await getDetailedTrendInfo(userId, trendId);
    return res.json({
      success: true,
      data: details,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch trend details";
    const status = msg.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: msg });
  }
});

// POST /api/trends/:id/generate -> Generate content opportunity angle (1 credit)
trendsRouter.post("/:id/generate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const trendId = req.params.id;

    // Check credits server-side
    const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    if (!access.allowed) {
      return res.status(402).json({
        code: access.code || "USAGE_LIMIT_REACHED",
        error: access.message || "Your free usage credits have been finished. Upgrade your plan to continue.",
      });
    }

    const details = await getDetailedTrendInfo(userId, trendId);
    const opportunity = details.opportunity || (await evaluateTrendRelevance(userId, details.trend));

    // Deduct 1 credit
    await consumeUsage(userId, "CONTENT_GENERATION");

    const studioUrl = `/create?topic=${encodeURIComponent(opportunity.recommendedAngle)}&platform=${encodeURIComponent(opportunity.recommendedPlatform)}&contentType=${encodeURIComponent(opportunity.recommendedFormat)}`;

    return res.json({
      success: true,
      data: {
        opportunity,
        studioUrl,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate trend opportunity";
    return res.status(500).json({ error: msg });
  }
});
