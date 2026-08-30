import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { getUserUsage, resolveUserIdForWorkspace, isUnlimitedUser } from "../services/usage-service.js";
import { getUserPlan } from "../services/entitlement-service.js";

export const usageRouter = Router();

usageRouter.use(requireAuth as any);

usageRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string);
    const userId = req.user?.id || (await resolveUserIdForWorkspace(undefined, workspaceId));
    const targetId = workspaceId ? await resolveUserIdForWorkspace(userId, workspaceId) : userId;

    const isUnlimited = await isUnlimitedUser(targetId);
    const plan = await getUserPlan(targetId);
    const usage = await getUserUsage(targetId);

    const now = new Date();
    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    return res.json({
      success: true,
      data: {
        plan: isUnlimited ? "ENTERPRISE (Unlimited)" : plan,
        isUnlimited,
        monthlyLimit: isUnlimited ? "Unlimited" : usage.freeCreditsTotal,
        usedCredits: usage.freeCreditsUsed,
        remainingCredits: isUnlimited ? "Unlimited" : usage.freeCreditsRemaining,
        resetPeriod: nextResetDate,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to fetch usage: ${msg}` });
  }
});
