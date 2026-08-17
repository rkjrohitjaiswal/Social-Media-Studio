import prisma from "@ai-social/database";
import { FREE_CREDITS_DEFAULT } from "../config/billing.js";
import { getUserPlan, getPlanEntitlements } from "./entitlement-service.js";

export interface StoredUserUsage {
  userId: string;
  freeCreditsTotal: number;
  freeCreditsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

// In-Memory Usage Store for Mock/Test & Authoritative PostgreSQL Cache
const usageMemoryStore = new Map<string, StoredUserUsage>();

export async function getUserUsage(userId: string): Promise<{
  freeCreditsTotal: number;
  freeCreditsUsed: number;
  freeCreditsRemaining: number;
}> {
  if (!userId) {
    throw new Error("User ID is required to fetch usage");
  }

  const plan = await getUserPlan(userId);
  const entitlements = getPlanEntitlements(plan);

  let record = usageMemoryStore.get(userId);

  if (!record) {
    try {
      const dbRecord = await prisma.userUsage.findUnique({
        where: { userId },
      });
      if (dbRecord) {
        record = {
          userId: dbRecord.userId,
          freeCreditsTotal: dbRecord.freeCreditsTotal,
          freeCreditsUsed: dbRecord.freeCreditsUsed,
          createdAt: dbRecord.createdAt,
          updatedAt: dbRecord.updatedAt,
        };
        usageMemoryStore.set(userId, record);
      }
    } catch {
      // DB offline in mock test mode
    }
  }

  if (!record) {
    const now = new Date();
    record = {
      userId,
      freeCreditsTotal: entitlements.monthlyWorkflows,
      freeCreditsUsed: 0,
      createdAt: now,
      updatedAt: now,
    };
    usageMemoryStore.set(userId, record);
  }

  const limit = entitlements.monthlyWorkflows;
  const used = record.freeCreditsUsed;
  const remaining = Math.max(0, limit - used);

  return {
    freeCreditsTotal: limit,
    freeCreditsUsed: used,
    freeCreditsRemaining: remaining,
  };
}

export async function checkUsageAccess(
  userId: string,
  action: "CONTENT_GENERATION" = "CONTENT_GENERATION"
): Promise<{
  allowed: boolean;
  code?: string;
  message?: string;
  freeCreditsRemaining: number;
  isPro: boolean;
}> {
  const plan = await getUserPlan(userId);
  const usage = await getUserUsage(userId);
  const isPaid = plan !== "FREE";

  if (usage.freeCreditsRemaining > 0) {
    return {
      allowed: true,
      freeCreditsRemaining: usage.freeCreditsRemaining,
      isPro: isPaid,
    };
  }

  if (plan === "FREE") {
    return {
      allowed: false,
      code: "PLAN_LIMIT_REACHED",
      message: "Your 3 free workflows are exhausted. Please upgrade your plan to continue.",
      freeCreditsRemaining: 0,
      isPro: false,
    };
  }

  return {
    allowed: false,
    code: "USAGE_LIMIT_REACHED",
    message: `You have reached your monthly limit of ${usage.freeCreditsTotal} workflows for the ${plan} plan. Upgrade to a higher tier to continue.`,
    freeCreditsRemaining: 0,
    isPro: true,
  };
}

export async function consumeUsage(
  userId: string,
  action: "CONTENT_GENERATION" = "CONTENT_GENERATION"
): Promise<{ freeCreditsTotal: number; freeCreditsUsed: number; freeCreditsRemaining: number }> {
  const plan = await getUserPlan(userId);
  const access = await checkUsageAccess(userId, action);

  if (!access.allowed) {
    if (plan === "FREE") {
      throw new Error("PLAN_LIMIT_REACHED: Your 3 free workflows are exhausted. Please upgrade your plan to continue.");
    } else {
      throw new Error(`USAGE_LIMIT_REACHED: You have reached your monthly workflow limit for the ${plan} plan.`);
    }
  }

  const currentUsage = await getUserUsage(userId);
  const updatedUsed = currentUsage.freeCreditsUsed + 1;
  const now = new Date();

  const record: StoredUserUsage = {
    userId,
    freeCreditsTotal: currentUsage.freeCreditsTotal,
    freeCreditsUsed: updatedUsed,
    createdAt: new Date(),
    updatedAt: now,
  };

  usageMemoryStore.set(userId, record);

  try {
    await prisma.userUsage.upsert({
      where: { userId },
      update: {
        freeCreditsUsed: updatedUsed,
        updatedAt: now,
      },
      create: {
        userId,
        freeCreditsTotal: currentUsage.freeCreditsTotal,
        freeCreditsUsed: updatedUsed,
      },
    });
  } catch {
    // DB offline in mock test mode
  }

  return {
    freeCreditsTotal: currentUsage.freeCreditsTotal,
    freeCreditsUsed: updatedUsed,
    freeCreditsRemaining: Math.max(0, currentUsage.freeCreditsTotal - updatedUsed),
  };
}

export async function consumeWorkflowCredit(userId: string) {
  return consumeUsage(userId, "CONTENT_GENERATION");
}

export function clearInMemoryUsage(): void {
  usageMemoryStore.clear();
}
