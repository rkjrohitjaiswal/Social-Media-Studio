import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { getPerformanceAdvisorReport } from "../services/advisor-service.js";

export const advisorRouter = Router();

// GET /api/analytics/advisor -> Fetch AI Performance Advisor insights (Free analysis)
advisorRouter.get("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const report = await getPerformanceAdvisorReport(userId);
    return res.json({
      success: true,
      data: report,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch performance advisor report";
    return res.status(500).json({ error: msg });
  }
});
