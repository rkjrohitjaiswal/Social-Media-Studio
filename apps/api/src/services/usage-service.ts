import prisma from "@ai-social/database";
import { getUserPlan, getPlanEntitlements } from "./entitlement-service.js";

export interface StoredUserUsage {
  userId: string;
  workspaceId?: string;
  freeCreditsTotal: number;
  freeCreditsUsed: number;
  permanentCreditsTotal: number;
  permanentCreditsUsed: number;
  monthlyCreditsAllowance: number;
  monthlyCreditsUsed: number;
  monthlyCycleStart?: Date;
  lastMonthlyReset?: Date;
  userCreatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DetailedUserUsage {
  freeCreditsTotal: number;
  freeCreditsUsed: number;
  freeCreditsRemaining: number;
  permanentCreditsTotal: number;
  permanentCreditsUsed: number;
  permanentCreditsRemaining: number;
  monthlyCreditsAllowance: number;
  monthlyCreditsUsed: number;
  monthlyCreditsRemaining: number;
  totalRemainingCredits: number;
  nextMonthlyResetDate: string;
  isInitialMonth: boolean;
}

// In-Memory Stores for Test / Fallback & Authoritative Locks
const usageMemoryStore = new Map<string, StoredUserUsage>();
const userCreatedAtMemoryStore = new Map<string, Date>();
const consumedScheduledPosts = new Set<string>();
const userLocks = new Map<string, Promise<void>>();

export function clearInMemoryUsage(): void {
  usageMemoryStore.clear();
  userCreatedAtMemoryStore.clear();
  consumedScheduledPosts.clear();
  userLocks.clear();
}

/**
 * Sets simulated user creation date for in-memory / unit testing scenarios.
 */
export function setInMemoryUserCreatedAt(userId: string, createdAt: Date): void {
  userCreatedAtMemoryStore.set(userId, createdAt);
  const existing = usageMemoryStore.get(userId);
  if (existing) {
    existing.userCreatedAt = createdAt;
  }
}

/**
 * Helper to add N full months to a Date cleanly, preserving day boundaries.
 */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return d;
}

/**
 * Determines the current monthly cycle start date, next reset date, and whether
 * the user is still within their initial 30-day signup period.
 */
export function getMonthlyCycleInfo(userCreatedAt: Date, now: Date): {
  isInitialMonth: boolean;
  cycleIndex: number;
  cycleStart: Date;
  nextResetDate: Date;
} {
  const created = new Date(userCreatedAt.getTime());
  const monthOneEnd = addMonths(created, 1);

  if (now < monthOneEnd) {
    return {
      isInitialMonth: true,
      cycleIndex: 0,
      cycleStart: created,
      nextResetDate: monthOneEnd,
    };
  }

  let k = 1;
  while (now >= addMonths(created, k + 1)) {
    k++;
  }

  const cycleStart = addMonths(created, k);
  const nextResetDate = addMonths(created, k + 1);

  return {
    isInitialMonth: false,
    cycleIndex: k,
    cycleStart,
    nextResetDate,
  };
}

/**
 * Ensures mutual exclusion for a specific identifier (userId or workspaceId)
 * to prevent concurrent race conditions during credit consumption.
 */
async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = userLocks.get(key) || Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  userLocks.set(key, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    if (userLocks.get(key) === currentLock.then(() => nextLock)) {
      userLocks.delete(key);
    }
  }
}

/**
 * Resolves the primary userId for a given workspaceId or returns the provided userId.
 */
export async function resolveUserIdForWorkspace(userId?: string, workspaceId?: string): Promise<string> {
  if (userId) return userId;

  if (workspaceId) {
    try {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true },
      });
      if (ws?.ownerId) return ws.ownerId;
    } catch {
      // Fallback
    }
    return `ws_user_${workspaceId}`;
  }

  return "demo-user-1";
}

/**
 * Server-side helper to check if a user can consume `amount` credits.
 */
export async function canUseCredits(userId: string, amount: number = 1): Promise<boolean> {
  const usage = await getUserUsage(userId);
  return usage.freeCreditsRemaining >= amount;
}

/**
 * Retrieves the current usage summary and handles lazy monthly resets.
 */
export async function getUserUsage(userIdOrWorkspaceId: string): Promise<DetailedUserUsage> {
  if (!userIdOrWorkspaceId) {
    throw new Error("User ID or Workspace ID is required to fetch usage");
  }

  const userId = userIdOrWorkspaceId;
  const plan = await getUserPlan(userId);
  const entitlements = getPlanEntitlements(plan);
  const now = new Date();

  let record = usageMemoryStore.get(userId);

  if (!record) {
    try {
      const dbRecord = await prisma.userUsage.findUnique({
        where: { userId },
        include: { user: { select: { createdAt: true } } },
      });
      if (dbRecord) {
        record = {
          userId: dbRecord.userId,
          freeCreditsTotal: dbRecord.freeCreditsTotal,
          freeCreditsUsed: dbRecord.freeCreditsUsed,
          permanentCreditsTotal: dbRecord.permanentCreditsTotal ?? 10,
          permanentCreditsUsed: dbRecord.permanentCreditsUsed ?? dbRecord.freeCreditsUsed ?? 0,
          monthlyCreditsAllowance: dbRecord.monthlyCreditsAllowance ?? 3,
          monthlyCreditsUsed: dbRecord.monthlyCreditsUsed ?? 0,
          monthlyCycleStart: dbRecord.monthlyCycleStart || undefined,
          lastMonthlyReset: dbRecord.lastMonthlyReset || undefined,
          userCreatedAt: dbRecord.user?.createdAt || dbRecord.createdAt,
          createdAt: dbRecord.createdAt,
          updatedAt: dbRecord.updatedAt,
        };
        usageMemoryStore.set(userId, record);
      }
    } catch {
      // DB offline fallback
    }
  }

  // Determine user account creation date
  let userCreatedAt = record?.userCreatedAt || userCreatedAtMemoryStore.get(userId);

  if (!userCreatedAt) {
    try {
      const userDb = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });
      if (userDb?.createdAt) {
        userCreatedAt = userDb.createdAt;
      }
    } catch {
      // Fallback
    }
  }

  if (!userCreatedAt) {
    userCreatedAt = record?.createdAt || now;
  }

  const cycleInfo = getMonthlyCycleInfo(userCreatedAt, now);

  if (!record) {
    record = {
      userId,
      freeCreditsTotal: 10,
      freeCreditsUsed: 0,
      permanentCreditsTotal: 10,
      permanentCreditsUsed: 0,
      monthlyCreditsAllowance: cycleInfo.isInitialMonth ? 0 : 3,
      monthlyCreditsUsed: 0,
      monthlyCycleStart: cycleInfo.cycleStart,
      lastMonthlyReset: cycleInfo.isInitialMonth ? undefined : now,
      userCreatedAt,
      createdAt: now,
      updatedAt: now,
    };
    usageMemoryStore.set(userId, record);

    try {
      await prisma.userUsage.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          freeCreditsTotal: 10,
          freeCreditsUsed: 0,
          permanentCreditsTotal: 10,
          permanentCreditsUsed: 0,
          monthlyCreditsAllowance: cycleInfo.isInitialMonth ? 0 : 3,
          monthlyCreditsUsed: 0,
          monthlyCycleStart: cycleInfo.cycleStart,
          lastMonthlyReset: cycleInfo.isInitialMonth ? undefined : now,
        },
      });
    } catch {
      // Non-fatal
    }
  }

  // Determine target monthly allowance based on plan and cycle
  let monthlyAllowance = 0;
  if (plan === "FREE") {
    monthlyAllowance = cycleInfo.isInitialMonth ? 0 : 3;
  } else {
    monthlyAllowance = entitlements.monthlyWorkflows;
  }

  // ── LAZY MONTHLY RESET ──────────────────────────────────────────────────────
  // Trigger reset if:
  // 1. Not in initial month (or on a paid plan), AND
  // 2. Haven't performed a monthly reset for the current cycle yet.
  const needsReset =
    (!cycleInfo.isInitialMonth || plan !== "FREE") &&
    (!record.lastMonthlyReset || record.lastMonthlyReset < cycleInfo.cycleStart);

  if (needsReset) {
    record.monthlyCreditsUsed = 0;
    record.monthlyCreditsAllowance = monthlyAllowance;
    record.monthlyCycleStart = cycleInfo.cycleStart;
    record.lastMonthlyReset = now;
    record.updatedAt = now;

    usageMemoryStore.set(userId, record);

    try {
      await prisma.userUsage.update({
        where: { userId },
        data: {
          monthlyCreditsUsed: 0,
          monthlyCreditsAllowance: monthlyAllowance,
          monthlyCycleStart: cycleInfo.cycleStart,
          lastMonthlyReset: now,
          updatedAt: now,
        },
      });
    } catch {
      // Non-fatal
    }
  }

  const permanentTotal = record.permanentCreditsTotal ?? 10;
  const permanentUsed = record.permanentCreditsUsed ?? 0;
  const permanentRemaining = Math.max(0, permanentTotal - permanentUsed);

  const monthlyUsed = record.monthlyCreditsUsed ?? 0;
  const monthlyRemaining = Math.max(0, monthlyAllowance - monthlyUsed);

  const totalRemaining = permanentRemaining + monthlyRemaining;
  const totalLimit = plan === "FREE" ? permanentTotal + monthlyAllowance : monthlyAllowance;

  // Sync legacy total/used fields
  record.freeCreditsTotal = totalLimit;
  record.freeCreditsUsed = permanentUsed + monthlyUsed;

  return {
    freeCreditsTotal: totalLimit,
    freeCreditsUsed: permanentUsed + monthlyUsed,
    freeCreditsRemaining: totalRemaining,
    permanentCreditsTotal: permanentTotal,
    permanentCreditsUsed: permanentUsed,
    permanentCreditsRemaining: permanentRemaining,
    monthlyCreditsAllowance: monthlyAllowance,
    monthlyCreditsUsed: monthlyUsed,
    monthlyCreditsRemaining: monthlyRemaining,
    totalRemainingCredits: totalRemaining,
    nextMonthlyResetDate: cycleInfo.nextResetDate.toISOString(),
    isInitialMonth: cycleInfo.isInitialMonth,
  };
}

/**
 * Checks whether a user/workspace has sufficient available credits.
 */
export async function checkUsageAccess(
  userIdOrWorkspaceId: string,
  action: "CONTENT_GENERATION" | "PUBLISHING" = "CONTENT_GENERATION"
): Promise<{
  allowed: boolean;
  code?: string;
  message?: string;
  freeCreditsRemaining: number;
  isPro: boolean;
}> {
  const userId = userIdOrWorkspaceId;
  const plan = await getUserPlan(userId);
  const usage = await getUserUsage(userId);
  const isPaid = plan !== "FREE";

  if (usage.totalRemainingCredits > 0) {
    return {
      allowed: true,
      freeCreditsRemaining: usage.totalRemainingCredits,
      isPro: isPaid,
    };
  }

  if (plan === "FREE") {
    return {
      allowed: false,
      code: "PLAN_LIMIT_REACHED",
      message: "Your free credits are exhausted. Please upgrade your plan to continue.",
      freeCreditsRemaining: 0,
      isPro: false,
    };
  }

  return {
    allowed: false,
    code: "USAGE_LIMIT_REACHED",
    message: `You have reached your monthly limit of ${usage.monthlyCreditsAllowance} credits for the ${plan} plan. Upgrade to a higher tier to continue.`,
    freeCreditsRemaining: 0,
    isPro: true,
  };
}

/**
 * Consumes credits atomically with lock protection against double-charges or negative balances.
 * Consumption Order:
 *   1. Monthly Credits (if available) — because monthly credits expire at cycle end.
 *   2. Permanent Credits — preserved until monthly credits are exhausted.
 */
export async function consumeUsage(
  userIdOrWorkspaceId: string,
  action: "CONTENT_GENERATION" | "PUBLISHING" = "CONTENT_GENERATION",
  cost: number = 1
): Promise<{ freeCreditsTotal: number; freeCreditsUsed: number; freeCreditsRemaining: number }> {
  return withLock(userIdOrWorkspaceId, async () => {
    const userId = userIdOrWorkspaceId;
    const plan = await getUserPlan(userId);
    const access = await checkUsageAccess(userId, action);

    if (!access.allowed) {
      const err = new Error(
        access.code === "PLAN_LIMIT_REACHED"
          ? "PLAN_LIMIT_REACHED: Your free credits are exhausted. Please upgrade your plan to continue."
          : `USAGE_LIMIT_REACHED: You have reached your monthly credit limit for the ${plan} plan.`
      );
      (err as any).statusCode = 402;
      throw err;
    }

    const currentUsage = await getUserUsage(userId);
    const now = new Date();

    let record = usageMemoryStore.get(userId)!;

    let permanentUsed = record.permanentCreditsUsed ?? 0;
    let monthlyUsed = record.monthlyCreditsUsed ?? 0;

    let remainingToConsume = cost;

    // 1. Consume from monthly credits first
    if (currentUsage.monthlyCreditsRemaining > 0) {
      const monthlyAvailable = currentUsage.monthlyCreditsRemaining;
      const consumeFromMonthly = Math.min(monthlyAvailable, remainingToConsume);
      monthlyUsed += consumeFromMonthly;
      remainingToConsume -= consumeFromMonthly;
    }

    // 2. Consume remaining cost from permanent credits
    if (remainingToConsume > 0) {
      permanentUsed += remainingToConsume;
      remainingToConsume = 0;
    }

    record.permanentCreditsUsed = permanentUsed;
    record.monthlyCreditsUsed = monthlyUsed;
    record.freeCreditsUsed = permanentUsed + monthlyUsed;
    record.updatedAt = now;

    usageMemoryStore.set(userId, record);

    try {
      await prisma.userUsage.upsert({
        where: { userId },
        update: {
          permanentCreditsUsed: permanentUsed,
          monthlyCreditsUsed: monthlyUsed,
          freeCreditsUsed: permanentUsed + monthlyUsed,
          updatedAt: now,
        },
        create: {
          userId,
          freeCreditsTotal: currentUsage.freeCreditsTotal,
          freeCreditsUsed: permanentUsed + monthlyUsed,
          permanentCreditsTotal: record.permanentCreditsTotal ?? 10,
          permanentCreditsUsed: permanentUsed,
          monthlyCreditsAllowance: record.monthlyCreditsAllowance ?? 3,
          monthlyCreditsUsed: monthlyUsed,
        },
      });
    } catch {
      // DB offline fallback
    }

    const updatedUsage = await getUserUsage(userId);

    return {
      freeCreditsTotal: updatedUsage.freeCreditsTotal,
      freeCreditsUsed: updatedUsage.freeCreditsUsed,
      freeCreditsRemaining: updatedUsage.totalRemainingCredits,
    };
  });
}

/**
 * Consumes 1 credit specifically for successful publishing execution.
 * Idempotent per scheduledPostId: guarantees a post is never charged twice on retries.
 */
export async function consumePublishingCredit(params: {
  userId?: string;
  workspaceId?: string;
  scheduledPostId?: string;
}): Promise<{ consumed: boolean; freeCreditsRemaining?: number }> {
  const { userId, workspaceId, scheduledPostId } = params;

  if (scheduledPostId && consumedScheduledPosts.has(scheduledPostId)) {
    return { consumed: false };
  }

  const targetId = await resolveUserIdForWorkspace(userId, workspaceId);
  const result = await consumeUsage(targetId, "PUBLISHING", 1);

  if (scheduledPostId) {
    consumedScheduledPosts.add(scheduledPostId);
  }

  return { consumed: true, freeCreditsRemaining: result.freeCreditsRemaining };
}

export async function consumeWorkflowCredit(userId: string) {
  return consumeUsage(userId, "CONTENT_GENERATION");
}
