import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { AI_GOALS_REGISTRY, runGoalWorkflowSchema, AiGoalId } from "@ai-social/shared";
import { checkUsageAccess, consumeUsage } from "../services/usage-service.js";

export const goalsRouter = Router();

// GET /api/goals -> List all 8 outcome-based AI goals
goalsRouter.get("/", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: Object.values(AI_GOALS_REGISTRY),
  });
});

// GET /api/goals/:goalId -> Get details for a single goal
goalsRouter.get("/:goalId", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const goalId = req.params.goalId as AiGoalId;
  const goal = AI_GOALS_REGISTRY[goalId];

  if (!goal) {
    return res.status(404).json({ error: `Goal with ID '${goalId}' not found.` });
  }

  return res.json({
    success: true,
    data: goal,
  });
});

// POST /api/goals/run -> Execute goal-guided AI content generation (credit-enforced)
goalsRouter.post("/run", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = runGoalWorkflowSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid goal workflow payload", details: parse.error.format() });
    }

    // Check server-side credit access
    const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    if (!access.allowed) {
      return res.status(402).json({
        code: access.code || "USAGE_LIMIT_REACHED",
        error: access.message || "Your free usage credits have been finished. Upgrade your plan to continue.",
      });
    }

    const { goalId, targetAudience, brandContext, productName, customNotes, targetPlatforms } = parse.data;
    const goal = AI_GOALS_REGISTRY[goalId];

    // Deduct exactly 1 credit server-side
    await consumeUsage(userId, "CONTENT_GENERATION");

    const generatedWorkflowResult = {
      workflowId: `gwf-${Date.now()}`,
      goalId,
      goalName: goal?.name || goalId,
      funnelStage: goal?.campaignStructure.funnelStage || "Awareness",
      generatedAt: new Date().toISOString(),
      stepOutputs: [
        {
          step: 1,
          name: "Audience & Angle",
          content: `Positioning tailored for ${targetAudience || "target audience"} focusing on ${goal?.description || "goal outcomes"}.`,
        },
        {
          step: 2,
          name: "Pattern-Interrupt Hook",
          content: `🔥 "Why most brands in ${brandContext || "your industry"} fail to ${goal?.name.toLowerCase()} — and the 3-step shift that fixes it."`,
        },
        {
          step: 3,
          name: "Core Content Body",
          content: `Here is the strategic breakdown for ${productName || "your brand"}:\n1. Identify current bottleneck.\n2. Implement structured workflow.\n3. Measure outcome vs baseline.`,
        },
        {
          step: 4,
          name: "Call to Action",
          content: goal?.campaignStructure.ctaStrategy || "Follow for daily insights",
        },
      ],
      platformAdaptations: targetPlatforms.map((platform) => ({
        platform,
        formattedCaption: `[${platform}] ${goal?.name}: ${productName || "Elevate your social media strategy"}. ${goal?.campaignStructure.ctaStrategy}`,
        hashtags: [`#${goalId.toLowerCase()}`, "#StudioAI", "#Growth"],
      })),
    };

    return res.json({
      success: true,
      data: generatedWorkflowResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to run goal workflow";
    return res.status(500).json({ error: msg });
  }
});
