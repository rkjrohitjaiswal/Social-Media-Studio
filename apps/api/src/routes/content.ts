import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { repurposeContent, adaptContent } from "../services/repurposing-service.js";
import { repurposeContentSchema, adaptContentSchema } from "@ai-social/shared";

export const contentRouter = Router();

// POST /api/content/repurpose -> Transform source content into platform-specific posts
contentRouter.post("/repurpose", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = repurposeContentSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid repurpose request format", details: parse.error.format() });
    }

    const result = await repurposeContent(userId, parse.data);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to repurpose content";
    const status = (err as any).code === "SUBSCRIPTION_REQUIRED" || (err as any).code === "USAGE_LIMIT_REACHED" ? 402 : 500;
    return res.status(status).json({ error: msg, code: (err as any).code });
  }
});

// POST /api/content/adapt -> Adapt base content for multiple target platforms
contentRouter.post("/adapt", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = adaptContentSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid adaptation request format", details: parse.error.format() });
    }

    const result = await adaptContent(userId, parse.data);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to adapt content";
    const status = (err as any).code === "SUBSCRIPTION_REQUIRED" || (err as any).code === "USAGE_LIMIT_REACHED" ? 402 : 500;
    return res.status(status).json({ error: msg, code: (err as any).code });
  }
});
