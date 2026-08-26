import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { generatePlanInputSchema, CalendarEntryItem } from "@ai-social/shared";
import { checkUsageAccess, consumeUsage } from "../services/usage-service.js";
import { prisma } from "@ai-social/database";
import {
  getDetailedTrendInfo,
  evaluateTrendRelevance,
} from "../services/trends/trend-service.js";
import { dispatchWebhookEvent } from "../services/webhook-service.js";


export const calendarRouter = Router();

// GET /api/calendar/plan -> Fetch all items for current user's active plan
calendarRouter.get("/plan", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const items = await prisma.contentPlanItem.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });

    const activePlan = await prisma.contentPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: {
        plan: activePlan || null,
        items,
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch calendar plan" });
  }
});

// POST /api/calendar/plan/generate -> Generate 7-Day or 30-Day Content Plan (1 Credit)
calendarRouter.post("/plan/generate", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = generatePlanInputSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid plan payload", details: parse.error.format() });
    }

    // Check credits
    const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    if (!access.allowed) {
      return res.status(402).json({
        code: access.code || "USAGE_LIMIT_REACHED",
        error: access.message || "Your free usage credits have been finished. Upgrade your plan to continue.",
      });
    }

    const { planType, platforms, campaignId } = parse.data;
    const daysCount = planType === "SEVEN_DAY" ? 7 : 30;
    const startDateObj = new Date();

    // Deduct 1 credit
    await consumeUsage(userId, "CONTENT_GENERATION");

    // Fetch user's content pillars
    const userPillars = await prisma.contentPillar.findMany({
      where: { userId, isActive: true },
    });

    const pillarNames = userPillars.length > 0
      ? userPillars.map((p: { name: string }) => p.name)
      : ["Educational & How-To", "Industry Insights", "Product Spotlight", "Behind The Scenes"];

    const contentTypesMap: Record<string, string[]> = {
      INSTAGRAM: ["Carousel", "Reel", "Single Image Post"],
      LINKEDIN: ["Document Carousel", "Text Post", "Thought Leadership"],
      YOUTUBE: ["Short", "Video"],
      X: ["Thread", "Short Post"],
      THREADS: ["Post", "Carousel"],
      FACEBOOK: ["Post", "Video"],
    };

    const itemsToCreate: CalendarEntryItem[] = [];
    const weeklyThemes: { weekNumber: number; theme: string; focus: string }[] = [];

    const weeksCount = Math.ceil(daysCount / 7);
    for (let w = 1; w <= weeksCount; w++) {
      weeklyThemes.push({
        weekNumber: w,
        theme: `Week ${w}: High-Value Authority & Growth`,
        focus: w === 1 ? "Problem Awareness & Hooks" : w === 2 ? "Educational Teardowns" : w === 3 ? "Social Proof & Demos" : "Conversion & CTAs",
      });
    }

    for (let i = 0; i < daysCount; i++) {
      const entryDate = new Date(startDateObj);
      entryDate.setDate(entryDate.getDate() + i);

      const targetPlatform = platforms[i % platforms.length] || "INSTAGRAM";
      const availableFormats = contentTypesMap[targetPlatform] || ["Post"];
      const targetFormat = availableFormats[i % availableFormats.length];
      const targetPillar = pillarNames[i % pillarNames.length];

      itemsToCreate.push({
        date: entryDate.toISOString(),
        dayNumber: i + 1,
        weekNumber: Math.floor(i / 7) + 1,
        platform: targetPlatform,
        contentType: targetFormat,
        pillarName: targetPillar,
        topic: `Day ${i + 1}: Strategic ${targetPillar} Breakdown`,
        hook: `Here is the #1 mistake creators make when executing ${targetPillar.toLowerCase()}...`,
        objective: "Drive engagement and saves",
        cta: "Save this post and drop a comment below",
        suggestedPostingTime: i % 2 === 0 ? "10:00 AM" : "04:30 PM",
        status: "DRAFT",
        aiRationale: `Scheduled for peak audience engagement based on ${targetPlatform} algorithm patterns.`,
      });
    }

    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + daysCount);

    // Save ContentPlan in DB
    const plan = await prisma.contentPlan.create({
      data: {
        userId,
        campaignId: campaignId || null,
        title: `${daysCount}-Day Strategy Content Plan`,
        planType,
        startDate: startDateObj,
        endDate: endDateObj,
        weeklyThemesJson: weeklyThemes as any,
      },
    });

    // Delete existing old draft plan items for fresh sync
    await prisma.contentPlanItem.deleteMany({
      where: { userId, status: "DRAFT" },
    });

    // Create plan items
    for (const item of itemsToCreate) {
      await prisma.contentPlanItem.create({
        data: {
          contentPlanId: plan.id,
          userId,
          date: new Date(item.date),
          platform: item.platform,
          contentType: item.contentType,
          pillarName: item.pillarName,
          topic: item.topic,
          hook: item.hook,
          objective: item.objective,
          cta: item.cta,
          suggestedPostingTime: item.suggestedPostingTime,
          status: item.status,
          aiRationale: item.aiRationale,
        },
      });
    }

    const createdItems = await prisma.contentPlanItem.findMany({
      where: { contentPlanId: plan.id },
      orderBy: { date: "asc" },
    });

    return res.json({
      success: true,
      data: {
        plan,
        items: createdItems,
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to generate AI content plan" });
  }
});

// PATCH /api/calendar/plan/item/:id -> Update calendar item (status, topic, date, etc.)
calendarRouter.patch("/plan/item/:id", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.contentPlanItem.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: "Calendar item not found or access denied" });
    }

    const updated = await prisma.contentPlanItem.update({
      where: { id },
      data: { ...req.body },
    });

    return res.json({
      success: true,
      data: updated,
    });
  } catch {
    return res.status(500).json({ error: "Failed to update calendar item" });
  }
});

// POST /api/calendar/plan/regenerate-day -> Regenerate single day item (1 Credit)
calendarRouter.post("/plan/regenerate-day", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.body;

    const existing = await prisma.contentPlanItem.findFirst({ where: { id: itemId, userId } });
    if (!existing) {
      return res.status(404).json({ error: "Calendar item not found" });
    }

    const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    if (!access.allowed) {
      return res.status(402).json({
        code: access.code || "USAGE_LIMIT_REACHED",
        error: access.message || "Your free usage credits have been finished.",
      });
    }

    await consumeUsage(userId, "CONTENT_GENERATION");

    const regenerated = await prisma.contentPlanItem.update({
      where: { id: itemId },
      data: {
        topic: `Fresh Perspective: ${existing.pillarName} Masterclass`,
        hook: `Re-evaluating everything we knew about ${existing.platform} engagement...`,
        objective: "Increase comment velocity and shares",
        cta: "Drop your thought below",
        aiRationale: "Regenerated with alternative high-converting hook framework.",
      },
    });

    return res.json({
      success: true,
      data: regenerated,
    });
  } catch {
    return res.status(500).json({ error: "Failed to regenerate day item" });
  }
});

// POST /api/calendar/add-trend -> Add trend opportunity to user's AI calendar
calendarRouter.post("/add-trend", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { trendId } = req.body;

    if (!trendId) {
      return res.status(400).json({ error: "trendId is required" });
    }

    // Resolve trend data server-side (never trust client scores)
    const trendDetails = await getDetailedTrendInfo(userId, trendId);
    if (!trendDetails || !trendDetails.trend) {
      return res.status(404).json({ error: "Trend not found" });
    }

    const { trend, opportunity } = trendDetails;
    const opp = opportunity || (await evaluateTrendRelevance(userId, trend));

    // Get or create user's active ContentPlan
    let activePlan = await prisma.contentPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!activePlan) {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);

      activePlan = await prisma.contentPlan.create({
        data: {
          userId,
          title: "30-Day Strategy Content Plan",
          planType: "THIRTY_DAY",
          startDate: now,
          endDate: end,
        },
      });

      if (!activePlan || !activePlan.id) {
        return res.status(500).json({ error: "Failed to create content plan — database unavailable" });
      }
    }

    const itemDate = req.body.date ? new Date(req.body.date) : new Date();

    const trendMetadata = {
      isTrend: true,
      trendId: trend.id,
      trendTitle: trend.title,
      source: trend.source === "GOOGLE_TRENDS" ? "Google Trends" : trend.source,
      region: trend.region,
      trendScore: trend.trendScore || opp.trendScore,
      lifecycle: trend.lifecycle || opp.lifecycle,
      relevanceScore: opp.relevanceScore,
      opportunityScore: opp.opportunityScore,
      recommendedAngle: opp.recommendedAngle,
      recommendedPlatform: opp.recommendedPlatform,
      recommendedFormat: opp.recommendedFormat,
      recommendedCta: opp.recommendedCta,
    };

    const newItem = await prisma.contentPlanItem.create({
      data: {
        contentPlanId: activePlan.id,
        userId,
        date: itemDate,
        platform: opp.recommendedPlatform !== "Platform recommendation unavailable." ? opp.recommendedPlatform : "INSTAGRAM",
        contentType: opp.recommendedFormat,
        pillarName: opp.contentPillarName || "Educational & How-To",
        topic: opp.recommendedAngle,
        hook: `🔥 Trend Hook: ${trend.title} - ${opp.what}`,
        objective: "Leverage viral search trend to drive audience reach",
        cta: opp.recommendedCta,
        suggestedPostingTime: "10:00 AM",
        status: "DRAFT",
        aiRationale: JSON.stringify(trendMetadata),
      },
    });

    if (!newItem || !newItem.id) {
      return res.status(500).json({ error: "Failed to create calendar item — database unavailable" });
    }

    return res.json({
      success: true,
      data: {
        item: newItem,
        trendMetadata,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add trend to calendar";
    return res.status(500).json({ error: msg });
  }
});

// Valid SocialPlatform enum values for ScheduledPost
const VALID_PLATFORMS = new Set([
  "INSTAGRAM", "LINKEDIN", "THREADS", "PINTEREST", "FACEBOOK",
  "TIKTOK", "YOUTUBE", "X", "REDDIT", "TELEGRAM",
  "BLUESKY", "GOOGLE_BUSINESS", "MASTODON", "DISCORD",
]);

// POST /api/calendar/schedule -> Schedule an APPROVED ContentPlanItem for publishing
calendarRouter.post("/schedule", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.workspaceId || null;
    const { contentPlanItemId, platform, scheduledAt } = req.body;

    // Validate required fields
    if (!contentPlanItemId || !scheduledAt) {
      return res.status(400).json({
        error: "contentPlanItemId and scheduledAt are required",
      });
    }

    // Validate scheduledAt is a valid date
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "scheduledAt must be a valid ISO date string" });
    }

    // Resolve ContentPlanItem server-side and verify ownership
    const contentItem = await prisma.contentPlanItem.findFirst({
      where: { id: contentPlanItemId, userId },
    });

    if (!contentItem) {
      return res.status(404).json({ error: "Content plan item not found or access denied" });
    }

    // Only APPROVED content can be scheduled
    if (contentItem.status !== "APPROVED") {
      return res.status(403).json({
        error: `Cannot schedule content with status '${contentItem.status}'. Only APPROVED content can be scheduled.`,
        currentStatus: contentItem.status,
      });
    }

    // Determine platform: use explicit platform param, fall back to content item's platform
    const targetPlatform = platform || contentItem.platform || "INSTAGRAM";
    if (!VALID_PLATFORMS.has(targetPlatform)) {
      return res.status(400).json({
        error: `Invalid platform '${targetPlatform}'. Must be one of: ${[...VALID_PLATFORMS].join(", ")}`,
      });
    }

    // Create ScheduledPost (unique constraint prevents duplicates)
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        userId,
        workspaceId,
        contentPlanItemId,
        platform: targetPlatform as any,
        scheduledAt: scheduledDate,
        status: "SCHEDULED",
      },
    });

    // Fire POST_SCHEDULED webhook event (fire-and-forget)
    dispatchWebhookEvent(
      workspaceId ?? "demo-workspace-1",
      userId,
      "POST_SCHEDULED",
      {
        scheduledPostId: scheduledPost.id,
        contentPlanItemId,
        platform: targetPlatform,
        scheduledAt: scheduledDate.toISOString(),
        status: "SCHEDULED",
      }
    );

    return res.status(201).json({
      success: true,
      data: scheduledPost,
    });
  } catch (err: unknown) {
    // Handle Prisma unique constraint violation (duplicate scheduling)
    if (err && typeof err === "object" && "code" in err && (err as any).code === "P2002") {
      return res.status(409).json({
        error: "This content is already scheduled for this platform and time",
      });
    }
    const msg = err instanceof Error ? err.message : "Failed to schedule content";
    return res.status(500).json({ error: msg });
  }
});

// GET /api/calendar/scheduled -> List scheduled posts for current user
calendarRouter.get("/scheduled", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: { userId },
      include: { contentPlanItem: true },
      orderBy: { scheduledAt: "asc" },
    });

    return res.json({
      success: true,
      data: scheduledPosts,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch scheduled posts" });
  }
});
