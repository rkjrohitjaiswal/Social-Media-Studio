import prisma from "@ai-social/database";
import { getUserPlan, getPlanEntitlements } from "./entitlement-service.js";

export interface StoredUserUsage {
  userId: string;
  workspaceId?: string;
  freeCreditsTotal: number;
  freeCreditsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

// In-Memory Stores for Test / Fallback & Authoritative Locks
const usageMemoryStore = new Map<string, StoredUserUsage>();
const consumedScheduledPosts = new Set<string>();
const userLocks = new Map<string, Promise<void>>();

export function clearInMemoryUsage(): void {
  usageMemoryStore.clear();
  consumedScheduledPosts.clear();
  userLocks.clear();
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
 * Checks whether a user ID or workspace ID belongs to an explicitly configured unlimited owner/admin.
 * Evaluates strictly against server-side environment configuration (OWNER_USER_ID, UNLIMITED_USER_IDS).
 * Does NOT grant unlimited credits based on WorkspaceMember roles or email address to prevent privilege escalation.
 */
export async function isUnlimitedUser(userIdOrWorkspaceId: string): Promise<boolean> {
  if (!userIdOrWorkspaceId) return false;

  const targetId = userIdOrWorkspaceId.trim();

  const ownerEnvId = process.env.OWNER_USER_ID?.trim();
  const unlimitedEnvIds = (process.env.UNLIMITED_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ownerEnvId && targetId === ownerEnvId) return true;
  if (unlimitedEnvIds.includes(targetId)) return true;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetId },
          { supabaseUid: targetId },
        ],
      },
      select: {
        id: true,
        supabaseUid: true,
      },
    });

    if (user) {
      if (ownerEnvId && (user.id === ownerEnvId || user.supabaseUid === ownerEnvId)) return true;
      if (unlimitedEnvIds.includes(user.id) || unlimitedEnvIds.includes(user.supabaseUid)) return true;
    }
  } catch {
    // DB offline or query fallback
  }

  return false;
}

/**
 * Server-side helper to check if a user can consume `amount` credits.
 * Always returns true for unlimited users.
 */
export async function canUseCredits(userId: string, amount: number = 1): Promise<boolean> {
  const unlimited = await isUnlimitedUser(userId);
  if (unlimited) return true;
  const usage = await getUserUsage(userId);
  return typeof usage.freeCreditsRemaining === "number" && usage.freeCreditsRemaining >= amount;
}

/**
 * Retrieves the current usage summary for a user or workspace.
 */
export async function getUserUsage(userIdOrWorkspaceId: string): Promise<{
  freeCreditsTotal: number | string;
  freeCreditsUsed: number;
  freeCreditsRemaining: number | string;
  isUnlimited: boolean;
}> {
  if (!userIdOrWorkspaceId) {
    throw new Error("User ID or Workspace ID is required to fetch usage");
  }

  const userId = userIdOrWorkspaceId;
  const isUnlimited = await isUnlimitedUser(userId);

  if (isUnlimited) {
    let record = usageMemoryStore.get(userId);
    return {
      freeCreditsTotal: "Unlimited",
      freeCreditsUsed: record ? record.freeCreditsUsed : 0,
      freeCreditsRemaining: "Unlimited",
      isUnlimited: true,
    };
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
    isUnlimited: false,
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
  freeCreditsRemaining: number | string;
  isPro: boolean;
  isUnlimited: boolean;
}> {
  const userId = userIdOrWorkspaceId;
  const isUnlimited = await isUnlimitedUser(userId);

  if (isUnlimited) {
    return {
      allowed: true,
      freeCreditsRemaining: "Unlimited",
      isPro: true,
      isUnlimited: true,
    };
  }

  const plan = await getUserPlan(userId);
  const usage = await getUserUsage(userId);
  const isPaid = plan !== "FREE";
  const numRemaining = typeof usage.freeCreditsRemaining === "number" ? usage.freeCreditsRemaining : 0;

  if (numRemaining > 0) {
    return {
      allowed: true,
      freeCreditsRemaining: numRemaining,
      isPro: isPaid,
      isUnlimited: false,
    };
  }

  if (plan === "FREE") {
    return {
      allowed: false,
      code: "PLAN_LIMIT_REACHED",
      message: "Your free credits are exhausted. Please upgrade your plan to continue.",
      freeCreditsRemaining: 0,
      isPro: false,
      isUnlimited: false,
    };
  }

  return {
    allowed: false,
    code: "USAGE_LIMIT_REACHED",
    message: `You have reached your monthly limit of ${usage.freeCreditsTotal} credits for the ${plan} plan. Upgrade to a higher tier to continue.`,
    freeCreditsRemaining: 0,
    isPro: true,
    isUnlimited: false,
  };
}

/**
 * Consumes credits atomically with lock protection against double-charges or negative balances.
 * Owner/admin accounts bypass credit deduction completely.
 */
export async function consumeUsage(
  userIdOrWorkspaceId: string,
  action: "CONTENT_GENERATION" | "PUBLISHING" = "CONTENT_GENERATION",
  cost: number = 1
): Promise<{ freeCreditsTotal: number | string; freeCreditsUsed: number; freeCreditsRemaining: number | string; isUnlimited: boolean }> {
  return withLock(userIdOrWorkspaceId, async () => {
    const userId = userIdOrWorkspaceId;
    const isUnlimited = await isUnlimitedUser(userId);

    if (isUnlimited) {
      // Unlimited users NEVER have credits deducted
      const currentUsage = await getUserUsage(userId);
      return {
        freeCreditsTotal: "Unlimited",
        freeCreditsUsed: currentUsage.freeCreditsUsed,
        freeCreditsRemaining: "Unlimited",
        isUnlimited: true,
      };
    }

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
    const numTotal = typeof currentUsage.freeCreditsTotal === "number" ? currentUsage.freeCreditsTotal : 999999;
    const updatedUsed = currentUsage.freeCreditsUsed + cost;
    const now = new Date();

    const record: StoredUserUsage = {
      userId,
      freeCreditsTotal: numTotal,
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
          freeCreditsTotal: numTotal,
          freeCreditsUsed: updatedUsed,
        },
      });
    } catch {
      // DB offline in mock test mode
    }

    return {
      freeCreditsTotal: currentUsage.freeCreditsTotal,
      freeCreditsUsed: updatedUsed,
      freeCreditsRemaining: Math.max(0, numTotal - updatedUsed),
      isUnlimited: false,
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
}): Promise<{ consumed: boolean; freeCreditsRemaining?: number | string; isUnlimited?: boolean }> {
  const { userId, workspaceId, scheduledPostId } = params;

  if (scheduledPostId && consumedScheduledPosts.has(scheduledPostId)) {
    return { consumed: false };
  }

  const targetId = await resolveUserIdForWorkspace(userId, workspaceId);
  const isUnlimited = await isUnlimitedUser(targetId);

  if (isUnlimited) {
    if (scheduledPostId) {
      consumedScheduledPosts.add(scheduledPostId);
    }
    return { consumed: true, freeCreditsRemaining: "Unlimited", isUnlimited: true };
  }

  const result = await consumeUsage(targetId, "PUBLISHING", 1);

  if (scheduledPostId) {
    consumedScheduledPosts.add(scheduledPostId);
  }

  return { consumed: true, freeCreditsRemaining: result.freeCreditsRemaining, isUnlimited: false };
}

export async function consumeWorkflowCredit(userId: string) {
  return consumeUsage(userId, "CONTENT_GENERATION");
}
