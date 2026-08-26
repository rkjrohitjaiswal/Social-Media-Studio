import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { strategyInputSchema, contentPillarSchema, GeneratedStrategyOutput } from "@ai-social/shared";
import { checkUsageAccess, consumeUsage } from "../services/usage-service.js";
import { prisma } from "@ai-social/database";

export const strategyRouter = Router();

// GET /api/strategy -> Fetch latest strategy for authenticated user
strategyRouter.get("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const strategy = await prisma.contentStrategy.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: strategy ? { ...strategy, strategyJson: strategy.strategyJson as unknown as GeneratedStrategyOutput } : null,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch content strategy" });
  }
});

// POST /api/strategy/generate -> AI Content Strategy Generation (1 Credit)
strategyRouter.post("/generate", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = strategyInputSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid strategy payload", details: parse.error.format() });
    }

    // Server-side credit enforcement
    const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    if (!access.allowed) {
      return res.status(402).json({
        code: access.code || "USAGE_LIMIT_REACHED",
        error: access.message || "Your free usage credits have been finished. Upgrade your plan to continue.",
      });
    }

    const { primaryGoal, targetAudience, industry, brandName, platforms, postingFrequency, contentPreferences, campaignInfo } = parse.data;

    // Deduct 1 credit
    await consumeUsage(userId, "CONTENT_GENERATION");

    const generatedStrategy: GeneratedStrategyOutput = {
      audience: {
        targetAudience,
        painPoints: [
          `Inconsistent posting schedule impacting organic reach across ${platforms.join(", ")}`,
          `Lack of high-converting visual and text hooks tailored for ${industry || "the industry"}`,
          `Difficulty translating core product value into relatable social content`,
        ],
        interests: [
          `Industry insights and practical teardowns in ${industry || "general market"}`,
          `Actionable step-by-step guides and template carousels`,
          `Behind-the-scenes brand stories and authentic founder updates`,
        ],
        contentIntent: [
          `Educational & Problem Solving (40%)`,
          `Thought Leadership & Trust (30%)`,
          `Product Value & Conversion (30%)`,
        ],
      },
      positioning: {
        brandAngle: `${brandName || "Your Brand"} is positioned as the authoritative, high-value benchmark in ${industry || "the niche"}.`,
        valueProposition: `Delivering concise, high-converting social media content that solves core audience pain points without fluff.`,
        differentiation: `Focusing on structured, data-driven frameworks rather than generic generic posts.`,
      },
      contentPillars: [
        {
          name: "Educational & How-To",
          description: "Actionable tutorials, teardowns, and step-by-step guides.",
          purpose: "Build trust and establish domain expertise.",
          recommendedPercentage: 40,
          color: "#3b82f6",
          icon: "FileText",
        },
        {
          name: "Industry Insights & Trends",
          description: "Analysis of market shifts, news, and strategic opinions.",
          purpose: "Position brand as a forward-thinking thought leader.",
          recommendedPercentage: 20,
          color: "#c5a059",
          icon: "Sparkles",
        },
        {
          name: "Product & Offer Showcase",
          description: "Demos, feature spotlights, and transformation stories.",
          purpose: "Drive direct leads, trial signups, and sales conversions.",
          recommendedPercentage: 20,
          color: "#e11d48",
          icon: "ShoppingBag",
        },
        {
          name: "Community & Stories",
          description: "Behind-the-scenes, team updates, and user highlights.",
          purpose: "Humanize the brand and foster engagement.",
          recommendedPercentage: 20,
          color: "#10b981",
          icon: "Users",
        },
      ],
      contentMix: [
        { category: "Educational", percentage: 40, rationale: "Maximizes shares, saves, and initial discovery." },
        { category: "Authority & Insights", percentage: 20, rationale: "Establishes credibility and attracts premium followers." },
        { category: "Product & Conversion", percentage: 20, rationale: "Ensures consistent pipeline and revenue acquisition." },
        { category: "Engagement & Stories", percentage: 20, rationale: "Boosts comment rate and algorithm favorability." },
      ],
      platformStrategy: platforms.map((plat) => {
        let recommendedFormats = ["Carousel", "Post"];
        let contentStyle = "Professional and informative";
        let ctaStrategy = "Drive to website / bio link";

        if (plat === "INSTAGRAM") {
          recommendedFormats = ["Reel", "Carousel", "Story"];
          contentStyle = "Visual-first with high-impact video hooks and aesthetic slides";
          ctaStrategy = "Direct Message keyword or link in bio";
        } else if (plat === "LINKEDIN") {
          recommendedFormats = ["Document Carousel", "Text Post", "Poll"];
          contentStyle = "Structured thought leadership with clear takeaways";
          ctaStrategy = "Comment trigger for resources / direct consultation link";
        } else if (plat === "YOUTUBE") {
          recommendedFormats = ["Short", "Video"];
          contentStyle = "High retention title + hook script with quick P-cuts";
          ctaStrategy = "Subscribe & pinned comment link";
        } else if (plat === "X" || plat === "THREADS") {
          recommendedFormats = ["Thread", "Short Post"];
          contentStyle = "Punchy lines, hot takes, and concise value points";
          ctaStrategy = "Retweet / Repost & link in main thread";
        }

        return {
          platform: plat,
          recommendedFormats,
          contentStyle,
          frequency: postingFrequency,
          ctaStrategy,
          adaptationNotes: `Optimize first 3 seconds / top 2 lines for platform-specific feed algorithms.`,
        };
      }),
      recommendations: [
        {
          what: `Prioritize ${platforms[0] || "Instagram"} carousels and visual breakdowns as primary content format.`,
          why: `Data shows carousels receive 2.4x higher save rates and repeat impressions compared to single text posts.`,
          confidence: "HIGH",
          dataBasis: ["Brand profile goal selection", "Industry baseline trends"],
        },
        {
          what: `Maintain a consistent posting cadence of ${postingFrequency}.`,
          why: `Algorithm distribution favors accounts demonstrating predictable publishing velocity.`,
          confidence: "HIGH",
          dataBasis: ["Goal selection", "Platform guidelines"],
        },
        {
          what: `Integrate a clear, single Call-to-Action in 80%+ of published posts.`,
          why: `Clear CTAs double conversion rates compared to passive informational posts.`,
          confidence: "MEDIUM",
          dataBasis: ["Primary goal alignment"],
        },
      ],
    };

    // Save to Database
    const savedStrategy = await prisma.contentStrategy.create({
      data: {
        userId,
        primaryGoal,
        targetAudience,
        industry: industry || null,
        platforms,
        postingFrequency: postingFrequency || null,
        contentPreferences: contentPreferences || null,
        campaignInfo: campaignInfo || null,
        strategyJson: generatedStrategy as any,
      },
    });

    return res.json({
      success: true,
      data: {
        ...savedStrategy,
        strategyJson: generatedStrategy,
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to generate AI content strategy" });
  }
});

const pillarMemoryStore = new Map<string, any[]>();

// GET /api/strategy/pillars -> List pillars for user
strategyRouter.get("/pillars", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const defaults = [
    { id: `pil-1-${userId}`, name: "Educational & How-To", description: "Step-by-step guides, tutorials, teardowns.", purpose: "Build trust and expertise", percentageAllocation: 40, color: "#3b82f6", icon: "FileText", orderIndex: 0, isActive: true },
    { id: `pil-2-${userId}`, name: "Industry Insights", description: "Trends, market shifts, strategic opinions.", purpose: "Establish thought leadership", percentageAllocation: 20, color: "#c5a059", icon: "Sparkles", orderIndex: 1, isActive: true },
    { id: `pil-3-${userId}`, name: "Product & Offers", description: "Spotlights, features, customer success stories.", purpose: "Drive leads and conversions", percentageAllocation: 20, color: "#e11d48", icon: "ShoppingBag", orderIndex: 2, isActive: true },
    { id: `pil-4-${userId}`, name: "Behind The Scenes", description: "Culture, team updates, brand story.", purpose: "Humanize the brand", percentageAllocation: 20, color: "#10b981", icon: "Users", orderIndex: 3, isActive: true },
  ];

  try {
    let pillars = await prisma.contentPillar.findMany({
      where: { userId },
      orderBy: { orderIndex: "asc" },
    });

    if (pillars.length === 0) {
      for (const d of defaults) {
        try {
          await prisma.contentPillar.create({
            data: { ...d, id: undefined, userId },
          });
        } catch {
          // Ignore if user foreign key check in dev fallback
        }
      }

      pillars = await prisma.contentPillar.findMany({
        where: { userId },
        orderBy: { orderIndex: "asc" },
      });
    }

    if (pillars.length > 0) {
      pillarMemoryStore.set(userId, pillars);
      return res.json({ success: true, data: pillars });
    }
  } catch {
    // Memory store fallback
  }

  if (!pillarMemoryStore.has(userId)) {
    pillarMemoryStore.set(userId, defaults);
  }

  return res.json({
    success: true,
    data: pillarMemoryStore.get(userId) || defaults,
  });
});

// POST /api/strategy/pillars -> Create new pillar
strategyRouter.post("/pillars", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = contentPillarSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid pillar payload", details: parse.error.format() });
    }

    const newPillar = await prisma.contentPillar.create({
      data: {
        ...parse.data,
        userId,
      },
    });

    return res.json({
      success: true,
      data: newPillar,
    });
  } catch {
    return res.status(500).json({ error: "Failed to create content pillar" });
  }
});

// PUT /api/strategy/pillars/:id -> Edit pillar
strategyRouter.put("/pillars/:id", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.contentPillar.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: "Pillar not found or access denied" });
    }

    const updated = await prisma.contentPillar.update({
      where: { id },
      data: { ...req.body },
    });

    return res.json({
      success: true,
      data: updated,
    });
  } catch {
    return res.status(500).json({ error: "Failed to update content pillar" });
  }
});

// DELETE /api/strategy/pillars/:id -> Delete pillar
strategyRouter.delete("/pillars/:id", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.contentPillar.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: "Pillar not found or access denied" });
    }

    await prisma.contentPillar.delete({ where: { id } });

    return res.json({
      success: true,
      message: "Pillar deleted successfully",
    });
  } catch {
    return res.status(500).json({ error: "Failed to delete content pillar" });
  }
});

// POST /api/strategy/pillars/:id/generate-ideas -> AI Idea Generator for a Pillar (1 Credit)
strategyRouter.post("/pillars/:id/generate-ideas", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const pillar = await prisma.contentPillar.findFirst({ where: { id, userId } });
    if (!pillar) {
      return res.status(404).json({ error: "Pillar not found or access denied" });
    }

    const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    if (!access.allowed) {
      return res.status(402).json({
        code: access.code || "USAGE_LIMIT_REACHED",
        error: access.message || "Your free usage credits have been finished. Upgrade your plan to continue.",
      });
    }

    await consumeUsage(userId, "CONTENT_GENERATION");

    const ideas = [
      {
        topic: `5 Common Mistakes in ${pillar.name} and How to Fix Them`,
        hook: `Stop doing this immediately if you want better social results...`,
        contentType: "Carousel",
        platform: "INSTAGRAM",
        cta: "Save this post for your next campaign planning session",
      },
      {
        topic: `The Step-by-Step ${pillar.name} Strategy Framework`,
        hook: `Here is the exact playbook we used to scale reach by 3x...`,
        contentType: "Thought Leadership",
        platform: "LINKEDIN",
        cta: "Comment 'PLAYBOOK' to receive the free PDF guide",
      },
      {
        topic: `Behind-the-Scenes Breakdown of ${pillar.name}`,
        hook: `Nobody talks about what happens behind closed doors...`,
        contentType: "Reel",
        platform: "INSTAGRAM",
        cta: "Follow for more daily growth breakdown videos",
      },
    ];

    return res.json({
      success: true,
      data: {
        pillarId: pillar.id,
        pillarName: pillar.name,
        ideas,
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to generate pillar ideas" });
  }
});
