import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { aiCampaignInputSchema, AiCampaignOutput } from "@ai-social/shared";
import { checkUsageAccess, consumeUsage } from "../services/usage-service.js";
import { prisma } from "@ai-social/database";
import {
  getDetailedTrendInfo,
  evaluateTrendRelevance,
} from "../services/trends/trend-service.js";

export const campaignPlannerRouter = Router();

// GET /api/campaigns/planner -> List all AI campaigns for user
campaignPlannerRouter.get("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const campaigns = await prisma.aiCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: campaigns,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// POST /api/campaigns/planner/generate -> Generate AI Campaign & Phases (1 Credit)
campaignPlannerRouter.post("/generate", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = aiCampaignInputSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid campaign payload", details: parse.error.format() });
    }

    const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    if (!access.allowed) {
      return res.status(402).json({
        code: access.code || "USAGE_LIMIT_REACHED",
        error: access.message || "Your free usage credits have been finished. Upgrade your plan to continue.",
      });
    }

    const { name, objective, productService, targetAudience, platforms, budget, cta, offer } = parse.data;

    // Deduct 1 credit
    await consumeUsage(userId, "CONTENT_GENERATION");

    const phases = [
      { phaseNumber: 1, name: "Awareness & Problem Tease", focus: "Highlight core industry pain points and tease solution", objective: "Maximize reach and impressions", duration: "Days 1-5" },
      { phaseNumber: 2, name: "Education & Solution Value", focus: "Deep-dive tutorials, feature breakdowns, and how-to guides", objective: "Build trust and domain authority", duration: "Days 6-12" },
      { phaseNumber: 3, name: "Trust & Social Proof", focus: "Case studies, testimonials, and transformation stories", objective: "Overcome objections and validate quality", duration: "Days 13-18" },
      { phaseNumber: 4, name: "Conversion & Offer Launch", focus: "Direct promotional CTAs, limited offers, and clear action prompts", objective: "Drive sales, trial signups, and lead captures", duration: "Days 19-25" },
      { phaseNumber: 5, name: "Follow-Up & Retention", focus: "User onboarding tips, recap carousels, and community Q&A", objective: "Retain new users and foster ongoing engagement", duration: "Days 26-30" },
    ];

    const topics = [
      { topic: `The Hidden Cost of Ignoring ${productService || name}`, pillar: "Awareness", recommendedPlatform: platforms[0] || "INSTAGRAM", recommendedFormat: "Carousel", hook: `Are you still relying on outdated methods for ${name}?`, cta: "Save this post to review with your team" },
      { topic: `How ${productService || name} Solves ${objective}`, pillar: "Education", recommendedPlatform: platforms[0] || "LINKEDIN", recommendedFormat: "Thought Leadership", hook: `Here is the step-by-step breakdown of how we solved ${objective}...`, cta: "Drop a comment for full workflow guide" },
      { topic: `Case Study: Transforming Results with ${name}`, pillar: "Social Proof", recommendedPlatform: platforms[1] || platforms[0] || "INSTAGRAM", recommendedFormat: "Reel", hook: `Watch how we achieved 3x growth in 14 days...`, cta: `Check the bio link to explore ${offer || "the offer"}` },
      { topic: `Official Release: ${name} Special Offer`, pillar: "Conversion", recommendedPlatform: platforms[0] || "INSTAGRAM", recommendedFormat: "Single Image Post", hook: `The wait is over: ${name} is officially live!`, cta: cta || "Click link in bio to claim your access now" },
    ];

    const generatedOutput: AiCampaignOutput = {
      name,
      positioning: `${name} is engineered to help ${targetAudience || "creators"} achieve ${objective}.`,
      coreMessage: `Transform your workflow with ${productService || name} — built for efficiency and real results.`,
      contentPillars: ["Awareness & Tease", "Education & Deep Dive", "Trust & Case Studies", "Conversion & CTAs"],
      phases,
      topics,
      platformAdaptations: platforms.map((p) => ({
        platform: p,
        contentStyle: p === "INSTAGRAM" ? "Visual carousel & high-energy reel" : "Structured text & document carousel",
        recommendedFormats: p === "INSTAGRAM" ? ["Carousel", "Reel"] : ["Thought Leadership", "Document Carousel"],
        ctaFormat: p === "INSTAGRAM" ? "Link in bio / DM keyword" : "Comment trigger / direct link",
      })),
      ctaStrategy: cta || "Direct drive to landing page / bio link",
      suggestedPostingFrequency: "4-5 posts per week across active platforms",
    };

    const savedCampaign = await prisma.aiCampaign.create({
      data: {
        userId,
        name,
        objective,
        productService: productService || null,
        targetAudience: targetAudience || null,
        platforms,
        budget: budget || null,
        cta: cta || null,
        offer: offer || null,
        positioning: generatedOutput.positioning,
        coreMessage: generatedOutput.coreMessage,
        phasesJson: phases as any,
        topicsJson: topics as any,
        platformAdaptationsJson: generatedOutput.platformAdaptations as any,
      },
    });

    return res.json({
      success: true,
      data: {
        ...savedCampaign,
        output: generatedOutput,
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to generate AI campaign" });
  }
});

// POST /api/campaigns/planner/from-trend -> Create campaign from trend context
campaignPlannerRouter.post("/from-trend", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { trendId } = req.body;

    if (!trendId) {
      return res.status(400).json({ error: "trendId is required" });
    }

    // Resolve trend server-side
    const trendDetails = await getDetailedTrendInfo(userId, trendId);
    if (!trendDetails || !trendDetails.trend) {
      return res.status(404).json({ error: "Trend not found" });
    }

    const { trend, opportunity } = trendDetails;
    const opp = opportunity || (await evaluateTrendRelevance(userId, trend));

    const campaignName = `🔥 Trend Campaign: ${trend.title}`;
    const objective = `Capitalize on viral trend "${trend.title}" to boost brand awareness and audience engagement`;

    const trendMetadata = {
      isTrend: true,
      trendId: trend.id,
      trendTitle: trend.title,
      source: trend.source === "GOOGLE_TRENDS" ? "Google Trends" : trend.source,
      trendScore: trend.trendScore || opp.trendScore,
      opportunityScore: opp.opportunityScore,
      recommendedAngle: opp.recommendedAngle,
      recommendedPlatform: opp.recommendedPlatform,
      recommendedFormat: opp.recommendedFormat,
    };

    const existing = await prisma.aiCampaign.findFirst({
      where: {
        userId,
        name: campaignName,
      },
    });

    if (existing) {
      return res.json({
        success: true,
        data: {
          campaign: existing,
          trendMetadata,
        },
      });
    }

    const campaign = await prisma.aiCampaign.create({
      data: {
        userId,
        name: campaignName,
        objective,
        targetAudience: `Niche Audience interested in ${trend.category}`,
        platforms: [opp.recommendedPlatform !== "Platform recommendation unavailable." ? opp.recommendedPlatform : "INSTAGRAM"],
        cta: opp.recommendedCta,
        positioning: `Trend Campaign leveraging "${trend.title}"`,
        coreMessage: opp.recommendedAngle,
        topicsJson: [
          {
            topic: opp.recommendedAngle,
            pillar: opp.contentPillarName || "Trend Hijack",
            recommendedPlatform: opp.recommendedPlatform,
            recommendedFormat: opp.recommendedFormat,
            hook: opp.what,
            cta: opp.recommendedCta,
            trendMetadata,
          },
        ] as any,
        phasesJson: [
          {
            phaseNumber: 1,
            name: "Trend Reaction & Hook",
            focus: `Break down "${trend.title}" with unique brand perspective`,
            duration: "Days 1-3",
          },
        ] as any,
      },
    });

    return res.json({
      success: true,
      data: {
        campaign,
        trendMetadata,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create campaign from trend";
    return res.status(500).json({ error: msg });
  }
});
