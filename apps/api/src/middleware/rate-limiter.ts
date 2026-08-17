import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.js";
import { getUserPlan, getPlanEntitlements } from "../services/entitlement-service.js";

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitTracker>();

export async function planRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id || "anonymous-dev-user";
  const now = Date.now();

  try {
    const plan = await getUserPlan(userId);
    const entitlements = getPlanEntitlements(plan);
    const hourlyLimit = entitlements.rateLimitPerHour;

    const key = `${userId}:${plan}`;
    let tracker = rateLimitMap.get(key);

    if (!tracker || now > tracker.resetAt) {
      tracker = { count: 1, resetAt: now + 3600000 }; // 1 hour window
      rateLimitMap.set(key, tracker);
      return next();
    }

    if (tracker.count >= hourlyLimit) {
      return res.status(429).json({
        code: "RATE_LIMITED",
        error: `Rate limit exceeded for ${plan} plan (Limit: ${hourlyLimit} requests/hour). Please wait or upgrade your plan.`,
        plan,
        limit: hourlyLimit,
        resetInSeconds: Math.ceil((tracker.resetAt - now) / 1000),
      });
    }

    tracker.count += 1;
    next();
  } catch (err: unknown) {
    next();
  }
}

export function clearInMemoryRateLimits(): void {
  rateLimitMap.clear();
}
