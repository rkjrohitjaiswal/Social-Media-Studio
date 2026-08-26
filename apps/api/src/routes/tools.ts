import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { AI_TOOLS_REGISTRY, executeToolSchema } from "@ai-social/shared";
import { checkUsageAccess, consumeUsage } from "../services/usage-service.js";

export const toolsRouter = Router();

// GET /api/tools -> List all 12 AI tools
toolsRouter.get("/", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: AI_TOOLS_REGISTRY,
  });
});

// GET /api/tools/:toolId -> Get tool configuration
toolsRouter.get("/:toolId", requireAuth as any, (req: AuthenticatedRequest, res: Response) => {
  const toolId = req.params.toolId;
  const tool = AI_TOOLS_REGISTRY.find((t) => t.id === toolId);

  if (!tool) {
    return res.status(404).json({ error: `Tool '${toolId}' not found` });
  }

  return res.json({
    success: true,
    data: tool,
  });
});

// POST /api/tools/:toolId/execute -> Execute AI tool (credit-enforced)
toolsRouter.post("/:toolId/execute", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const toolId = req.params.toolId;
    const tool = AI_TOOLS_REGISTRY.find((t) => t.id === toolId);

    if (!tool) {
      return res.status(404).json({ error: `Tool '${toolId}' not found` });
    }

    const parse = executeToolSchema.safeParse({ ...req.body, toolId });
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid tool execution payload", details: parse.error.format() });
    }

    // Check server-side usage credits
    const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
    if (!access.allowed) {
      return res.status(402).json({
        code: access.code || "USAGE_LIMIT_REACHED",
        error: access.message || "Your free usage credits have been finished. Upgrade your plan to continue.",
      });
    }

    const { topicInput, platform, brandContext } = parse.data;

    // Deduct 1 credit
    await consumeUsage(userId, "CONTENT_GENERATION");

    let resultOutput: any;

    if (toolId === "hook-generator") {
      resultOutput = {
        hooks: [
          "1. 'Stop making this mistake when trying to scale on " + platform + "...'",
          "2. 'The secret strategy behind 6-figure " + topicInput + " campaigns nobody talks about.'",
          "3. 'Here is what 90% of brands get wrong about " + topicInput + ".'",
          "4. '3 simple shifts to double your " + topicInput + " engagement this week.'",
          "5. 'If you only do one thing for your " + platform + " growth, do this.'",
        ],
        viralityScore: 94,
      };
    } else if (toolId === "carousel-generator") {
      resultOutput = {
        slides: [
          { slide: 1, title: "Cover: How to Master " + topicInput, subtitle: "Swipe to learn the 5-step framework" },
          { slide: 2, title: "Step 1: Foundational Setup", body: "Establish clear brand guidelines and target audience vectors." },
          { slide: 3, title: "Step 2: Consistent Production", body: "Batch create content using AI-assisted hooks and templates." },
          { slide: 4, title: "Step 3: Multi-Channel Optimization", body: "Format copy specifically for " + platform + " algorithms." },
          { slide: 5, title: "Step 4: Analytics Review", body: "Double down on your highest performing content styles." },
          { slide: 6, title: "Save This Post!", body: "Tap the save button so you can reference this framework later." },
        ],
      };
    } else if (toolId === "hashtag-assistant") {
      resultOutput = {
        primaryHashtags: ["#" + topicInput.replace(/\s+/g, ""), "#StudioAI", "#GrowthHacking", "#MarketingStrategy"],
        nicheHashtags: ["#ContentCreator", "#DigitalMarketing2026", "#SaaSGrowth", "#BrandStrategy"],
        seoKeywords: [topicInput, platform + " growth", "AI social media", "content automation"],
      };
    } else {
      resultOutput = {
        generatedContent: `[${tool.name} - ${platform}]\n\nTopic: ${topicInput}\n\n${
          brandContext ? "Brand Context: " + brandContext + "\n\n" : ""
        }✨ Crafted with Studio AI precision. Optimize your ${platform} presentation with high-converting visual and textual hooks.\n\n👉 Follow for more actionable ${topicInput} insights!`,
        hashtags: ["#" + topicInput.replace(/\s+/g, ""), "#StudioAI", "#" + platform],
        cta: "Save and share this post with your team.",
      };
    }

    return res.json({
      success: true,
      data: {
        toolId,
        toolName: tool.name,
        platform,
        output: resultOutput,
        executedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to execute AI tool";
    return res.status(500).json({ error: msg });
  }
});
