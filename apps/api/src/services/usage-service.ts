import prisma from "@ai-social/database";
import { getUserPlan, getPlanEntitlements } from "./entitlement-service.js";

export interface StoredUserUsage {
  userId: string;
  workspaceId?: string;
  freeCreditsTotal: number;
  freeCreditsUsed: number;
  permanentCreditsTotal?: number;
  permanentCreditsUsed?: number;
  monthlyCreditsAllowance?: number;
  monthlyCreditsUsed?: number;
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
  monthlyLimit: number;
  usedCredits: number;
  remainingCredits: number;
  totalRemainingCredits: number;
  permanentCreditsTotal: number;
  permanentCreditsUsed: number;
  permanentCreditsRemaining: number;
  monthlyCreditsAllowance: number;
  monthlyCreditsUsed: number;
  monthlyCreditsRemaining: number;
  nextMonthlyResetDate: string;
  isInitialMonth: boolean;
  cycleIndex: number;
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
    existing.monthlyCycleStart = undefined;
    existing.lastMonthlyReset = undefined;
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
 * Determines the current monthly cycle start date, next reset date, and cycle index based on user signup date.
 * Cycle 0 (Month 1): userCreatedAt -> userCreatedAt + 1 Month (Allowance: 10 credits)
 * Cycle 1+ (Month 2+): userCreatedAt + k Months -> userCreatedAt + (k+1) Months (Allowance: 3 credits)
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
 * Retrieves the current single usage summary and performs lazy monthly cycle resets.
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
          permanentCreditsTotal: dbRecord.permanentCreditsTotal ?? dbRecord.freeCreditsTotal,
          permanentCreditsUsed: dbRecord.permanentCreditsUsed ?? dbRecord.freeCreditsUsed,
          monthlyCreditsAllowance: dbRecord.monthlyCreditsAllowance ?? dbRecord.freeCreditsTotal,
          monthlyCreditsUsed: dbRecord.monthlyCreditsUsed ?? dbRecord.freeCreditsUsed,
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

  // Determine single authoritative allowance for the current cycle
  let currentAllowance = 10;
  if (plan === "FREE") {
    currentAllowance = cycleInfo.isInitialMonth ? 10 : 3;
  } else {
    currentAllowance = entitlements.monthlyWorkflows;
  }

  if (!record) {
    record = {
      userId,
      freeCreditsTotal: currentAllowance,
      freeCreditsUsed: 0,
      permanentCreditsTotal: currentAllowance,
      permanentCreditsUsed: 0,
      monthlyCreditsAllowance: currentAllowance,
      monthlyCreditsUsed: 0,
      monthlyCycleStart: cycleInfo.cycleStart,
      lastMonthlyReset: now,
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
          freeCreditsTotal: currentAllowance,
          freeCreditsUsed: 0,
          permanentCreditsTotal: currentAllowance,
          permanentCreditsUsed: 0,
          monthlyCreditsAllowance: currentAllowance,
          monthlyCreditsUsed: 0,
          monthlyCycleStart: cycleInfo.cycleStart,
          lastMonthlyReset: now,
        },
      });
    } catch {
      // Non-fatal
    }
  }

  // ── LAZY MONTHLY CYCLE RESET ───────────────────────────────────────────────
  // Trigger reset if:
  // 1. Haven't performed a monthly reset for the current cycle yet, OR
  // 2. monthlyCycleStart is missing / outdated, OR
  // 3. freeCreditsTotal does not match current cycle allowance (e.g. Month 1 -> Month 2 transition), OR
  // 4. Stale legacy DB record has freeCreditsUsed exceeding currentAllowance.
  const needsReset =
    !record.monthlyCycleStart ||
    record.monthlyCycleStart < cycleInfo.cycleStart ||
    !record.lastMonthlyReset ||
    record.lastMonthlyReset < cycleInfo.cycleStart ||
    record.freeCreditsTotal !== currentAllowance ||
    record.freeCreditsUsed > currentAllowance;

  if (needsReset) {
    const isNewCycle = !record.monthlyCycleStart || record.monthlyCycleStart < cycleInfo.cycleStart;
    const newUsed = isNewCycle ? 0 : Math.min(record.freeCreditsUsed, currentAllowance);

    record.freeCreditsTotal = currentAllowance;
    record.freeCreditsUsed = newUsed;
    record.permanentCreditsTotal = currentAllowance;
    record.permanentCreditsUsed = newUsed;
    record.monthlyCreditsAllowance = currentAllowance;
    record.monthlyCreditsUsed = newUsed;
    record.monthlyCycleStart = cycleInfo.cycleStart;
    record.lastMonthlyReset = now;
    record.updatedAt = now;

    usageMemoryStore.set(userId, record);

    try {
      await prisma.userUsage.update({
        where: { userId },
        data: {
          freeCreditsTotal: currentAllowance,
          freeCreditsUsed: newUsed,
          permanentCreditsTotal: currentAllowance,
          permanentCreditsUsed: newUsed,
          monthlyCreditsAllowance: currentAllowance,
          monthlyCreditsUsed: newUsed,
          monthlyCycleStart: cycleInfo.cycleStart,
          lastMonthlyReset: now,
          updatedAt: now,
        },
      });
    } catch {
      // Non-fatal
    }
  }

  const freeCreditsTotal = record.freeCreditsTotal;
  const freeCreditsUsed = record.freeCreditsUsed;
  const freeCreditsRemaining = Math.max(0, freeCreditsTotal - freeCreditsUsed);

  return {
    freeCreditsTotal,
    freeCreditsUsed,
    freeCreditsRemaining,
    monthlyLimit: freeCreditsTotal,
    usedCredits: freeCreditsUsed,
    remainingCredits: freeCreditsRemaining,
    totalRemainingCredits: freeCreditsRemaining,

    // Mirror fields for backward compatibility
    permanentCreditsTotal: freeCreditsTotal,
    permanentCreditsUsed: freeCreditsUsed,
    permanentCreditsRemaining: freeCreditsRemaining,
    monthlyCreditsAllowance: freeCreditsTotal,
    monthlyCreditsUsed: freeCreditsUsed,
    monthlyCreditsRemaining: freeCreditsRemaining,

    nextMonthlyResetDate: cycleInfo.nextResetDate.toISOString(),
    isInitialMonth: cycleInfo.isInitialMonth,
    cycleIndex: cycleInfo.cycleIndex,
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
      message: "Your monthly credits are exhausted. Please upgrade your plan to continue.",
      freeCreditsRemaining: 0,
      isPro: false,
    };
  }

  return {
    allowed: false,
    code: "USAGE_LIMIT_REACHED",
    message: `You have reached your monthly limit of ${usage.monthlyLimit} credits for the ${plan} plan. Upgrade to a higher tier to continue.`,
    freeCreditsRemaining: 0,
    isPro: true,
  };
}

/**
 * Consumes credits atomically from the single credit balance with lock protection.
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
          ? "PLAN_LIMIT_REACHED: Your monthly credits are exhausted. Please upgrade your plan to continue."
          : `USAGE_LIMIT_REACHED: You have reached your monthly credit limit for the ${plan} plan.`
      );
      (err as any).statusCode = 402;
      throw err;
    }

    const currentUsage = await getUserUsage(userId);
    const now = new Date();

    let record = usageMemoryStore.get(userId)!;
    const newUsed = record.freeCreditsUsed + cost;

    record.freeCreditsUsed = newUsed;
    record.permanentCreditsUsed = newUsed;
    record.monthlyCreditsUsed = newUsed;
    record.updatedAt = now;

    usageMemoryStore.set(userId, record);

    try {
      await prisma.userUsage.upsert({
        where: { userId },
        update: {
          freeCreditsUsed: newUsed,
          permanentCreditsUsed: newUsed,
          monthlyCreditsUsed: newUsed,
          updatedAt: now,
        },
        create: {
          userId,
          freeCreditsTotal: currentUsage.freeCreditsTotal,
          freeCreditsUsed: newUsed,
          permanentCreditsTotal: currentUsage.freeCreditsTotal,
          permanentCreditsUsed: newUsed,
          monthlyCreditsAllowance: currentUsage.freeCreditsTotal,
          monthlyCreditsUsed: newUsed,
        },
      });
    } catch {
      // DB offline fallback
    }

    const updatedUsage = await getUserUsage(userId);

    return {
      freeCreditsTotal: updatedUsage.freeCreditsTotal,
      freeCreditsUsed: updatedUsage.freeCreditsUsed,
      freeCreditsRemaining: updatedUsage.freeCreditsRemaining,
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
