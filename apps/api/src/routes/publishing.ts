import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { executeDueScheduledPosts } from "../services/publishing-service.js";

export const publishingRouter = Router();

// POST /api/publishing/execute-due -> Trigger manual execution of due scheduled posts for active workspace
publishingRouter.post("/execute-due", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.workspaceId || "demo-workspace-1";

    const summary = await executeDueScheduledPosts({
      workspaceId,
      userId,
    });

    return res.json({
      success: true,
      data: summary,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to execute due scheduled posts";
    return res.status(500).json({ error: msg });
  }
});
