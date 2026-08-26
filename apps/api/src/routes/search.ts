import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { AI_TOOLS_REGISTRY, AI_GOALS_REGISTRY, SEED_TEMPLATES } from "@ai-social/shared";
import { prisma } from "@ai-social/database";

export const searchRouter = Router();

// GET /api/search?q=query&platform=INSTAGRAM&contentType=Post&status=PUBLISHED
searchRouter.get("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const query = ((req.query.q as string) || "").trim().toLowerCase();
    const platformFilter = ((req.query.platform as string) || "").toUpperCase();
    const contentTypeFilter = ((req.query.contentType as string) || "").toLowerCase();
    const statusFilter = ((req.query.status as string) || "").toUpperCase();

    if (!query && !platformFilter && !contentTypeFilter && !statusFilter) {
      return res.json({
        success: true,
        data: {
          results: [],
          total: 0,
        },
      });
    }

    const results: any[] = [];

    // 1. Search AI Tools
    AI_TOOLS_REGISTRY.forEach((tool) => {
      const matchQuery = !query || tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query);
      const matchPlatform = !platformFilter || tool.supportedPlatforms.includes(platformFilter);

      if (matchQuery && matchPlatform) {
        results.push({
          id: `tool-${tool.id}`,
          type: "TOOL",
          title: tool.name,
          description: tool.description,
          category: tool.category,
          url: `/tools/${tool.id}`,
        });
      }
    });

    // 2. Search AI Goals
    Object.values(AI_GOALS_REGISTRY).forEach((goal) => {
      const matchQuery = !query || goal.name.toLowerCase().includes(query) || goal.description.toLowerCase().includes(query);
      const matchPlatform = !platformFilter || goal.recommendedPlatforms.includes(platformFilter);

      if (matchQuery && matchPlatform) {
        results.push({
          id: `goal-${goal.id}`,
          type: "GOAL",
          title: goal.name,
          description: goal.description,
          category: "AI_GOAL",
          url: `/goals`,
        });
      }
    });

    // 3. Search Built-in & User Templates
    SEED_TEMPLATES.forEach((tpl) => {
      const matchQuery = !query || tpl.name.toLowerCase().includes(query) || tpl.description.toLowerCase().includes(query);
      const matchPlatform = !platformFilter || tpl.platform.toUpperCase() === platformFilter;
      const matchType = !contentTypeFilter || tpl.contentType.toLowerCase() === contentTypeFilter;

      if (matchQuery && matchPlatform && matchType) {
        results.push({
          id: `template-${tpl.id}`,
          type: "TEMPLATE",
          title: tpl.name,
          description: tpl.description,
          category: tpl.category,
          url: `/templates`,
        });
      }
    });

    // 4. Search User Database Brands (Scoped strictly to userId)
    try {
      const brands = await prisma.brandProfile.findMany({
        where: {
          userId,
          ...(query ? { brandName: { contains: query, mode: "insensitive" } } : {}),
        },
      });

      brands.forEach((brand: any) => {
        results.push({
          id: `brand-${brand.id}`,
          type: "BRAND",
          title: brand.brandName,
          description: brand.description || "Brand Kit",
          category: "BRAND_PROFILE",
          url: `/brand`,
        });
      });
    } catch {
      // Ignore database connection issues during fallback tests
    }

    // 5. Search User Saved Content (Scoped strictly to userId)
    try {
      const savedItems = await prisma.savedItem.findMany({
        where: {
          userId,
          ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
        },
      });

      savedItems.forEach((saved: any) => {
        results.push({
          id: `saved-${saved.id}`,
          type: "SAVED_CONTENT",
          title: saved.title,
          description: `Saved ${saved.itemType}`,
          category: saved.itemType,
          url: `/saved`,
        });
      });
    } catch {
      // Fallback
    }

    // 6. Search Content Pillars
    try {
      const pillars = await prisma.contentPillar.findMany({
        where: {
          userId,
          ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
        },
      });

      pillars.forEach((p: any) => {
        results.push({
          id: `pillar-${p.id}`,
          type: "PILLAR",
          title: p.name,
          description: p.description,
          category: "CONTENT_PILLAR",
          url: `/strategy/pillars`,
        });
      });
    } catch {
      // Fallback
    }

    // 7. Search AI Campaigns
    try {
      const campaigns = await prisma.aiCampaign.findMany({
        where: {
          userId,
          ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
        },
      });

      campaigns.forEach((c: any) => {
        results.push({
          id: `campaign-${c.id}`,
          type: "CAMPAIGN",
          title: c.name,
          description: c.objective,
          category: "AI_CAMPAIGN",
          url: `/campaigns/planner`,
        });
      });
    } catch {
      // Fallback
    }

    // 8. Search Real Trend Records
    try {
      const trends = await prisma.trend.findMany({
        where: {
          ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
          ...(platformFilter ? { platform: platformFilter } : {}),
        },
        take: 5,
      });

      trends.forEach((t: any) => {
        results.push({
          id: `trend-${t.id}`,
          type: "TREND",
          title: t.title,
          description: t.description,
          category: t.category,
          url: `/trends/${t.id}`,
        });
      });
    } catch {
      // Fallback
    }

    return res.json({
      success: true,
      data: {
        results,
        total: results.length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Search failed";
    return res.status(500).json({ error: msg });
  }
});
