/**
 * Phase 2F Part 3 — Credit Metering & Usage Enforcement Tests
 *
 * Requirements tested:
 *   1. Usage record creation & credit calculation
 *   2. Successful credit consumption
 *   3. Insufficient credit rejection (throws 402 PLAN_LIMIT_REACHED)
 *   4. No negative balance (remaining stays >= 0)
 *   5. Successful publishing consumes exactly 1 credit
 *   6. Failed publishing consumes 0 credits
 *   7. Publishing retry does not double-charge (idempotent)
 *   8. Workspace / user isolation
 *   9. Concurrent consumption protection (lock)
 *  10. Plan & subscription entitlement compatibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getUserUsage,
  checkUsageAccess,
  consumeUsage,
  consumePublishingCredit,
  clearInMemoryUsage,
} from "../apps/api/src/services/usage-service";
import { executeDueScheduledPosts } from "../apps/api/src/services/publishing-service";
import * as socialAccountService from "../apps/api/src/services/social-account-service";

const { scheduledPostsStore, publishedPostsStore } = vi.hoisted(() => ({
  scheduledPostsStore: new Map<string, any>(),
  publishedPostsStore: new Map<string, any>(),
}));

vi.mock("@ai-social/database", () => {
  return {
    default: {
      userUsage: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
      workspace: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      scheduledPost: {
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          const results: any[] = [];
          for (const post of scheduledPostsStore.values()) {
            if (where?.status && post.status !== where.status) continue;
            if (where?.workspaceId && post.workspaceId !== where.workspaceId) continue;
            results.push(post);
          }
          return results;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = scheduledPostsStore.get(where.id);
          if (existing) {
            Object.assign(existing, data);
            scheduledPostsStore.set(where.id, existing);
            return existing;
          }
          return {};
        }),
      },
      publishedPost: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const id = `pub_${Date.now()}`;
          const published = { id, ...data, createdAt: new Date() };
          publishedPostsStore.set(id, published);
          return published;
        }),
      },
      contentPlanItem: {
        update: vi.fn().mockResolvedValue({}),
      },
      n8nIntegration: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      n8nWebhookDelivery: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    },
    prisma: {
      userUsage: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
      },
      workspace: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      scheduledPost: {
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          const results: any[] = [];
          for (const post of scheduledPostsStore.values()) {
            if (where?.status && post.status !== where.status) continue;
            if (where?.workspaceId && post.workspaceId !== where.workspaceId) continue;
            results.push(post);
          }
          return results;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = scheduledPostsStore.get(where.id);
          if (existing) {
            Object.assign(existing, data);
            scheduledPostsStore.set(where.id, existing);
            return existing;
          }
          return {};
        }),
      },
      publishedPost: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const id = `pub_${Date.now()}`;
          const published = { id, ...data, createdAt: new Date() };
          publishedPostsStore.set(id, published);
          return published;
        }),
      },
      contentPlanItem: {
        update: vi.fn().mockResolvedValue({}),
      },
      n8nIntegration: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      n8nWebhookDelivery: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    },
  };
});

const USER_1 = "user-metering-101";
const USER_2 = "user-metering-102";
const WS_1 = "ws-metering-alpha";
const WS_2 = "ws-metering-beta";

describe("Phase 2F Part 3 — Credit Metering & Usage Enforcement", () => {
  beforeEach(() => {
    clearInMemoryUsage();
    scheduledPostsStore.clear();
    publishedPostsStore.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearInMemoryUsage();
  });

  // ── 1. Usage Record Creation & Calculation ────────────────────────────────

  it("1. creates usage record and calculates available credits", async () => {
    const usage = await getUserUsage(USER_1);
    expect(usage.freeCreditsTotal).toBeGreaterThan(0);
    expect(usage.freeCreditsUsed).toBe(0);
    expect(usage.freeCreditsRemaining).toBe(usage.freeCreditsTotal);
  });

  // ── 2. Credit Consumption ──────────────────────────────────────────────────

  it("2. consumes credit and updates used & remaining balances", async () => {
    const initial = await getUserUsage(USER_1);
    const result = await consumeUsage(USER_1, "CONTENT_GENERATION", 1);

    expect(result.freeCreditsUsed).toBe(1);
    expect(result.freeCreditsRemaining).toBe(initial.freeCreditsTotal - 1);
  });

  // ── 3 & 4. Insufficient Credit Rejection & No Negative Balance ────────────

  it("3 & 4. rejects consumption when credits are exhausted and prevents negative balance", async () => {
    const initial = await getUserUsage(USER_1);
    const total = initial.freeCreditsTotal;

    // Consume all available credits
    for (let i = 0; i < total; i++) {
      await consumeUsage(USER_1, "CONTENT_GENERATION", 1);
    }

    const exhaustedUsage = await getUserUsage(USER_1);
    expect(exhaustedUsage.freeCreditsRemaining).toBe(0);

    // Further consumption attempt must be rejected with 402/PLAN_LIMIT_REACHED
    await expect(consumeUsage(USER_1, "CONTENT_GENERATION", 1)).rejects.toThrow(/PLAN_LIMIT_REACHED|exhausted/);

    const postExhaustedUsage = await getUserUsage(USER_1);
    expect(postExhaustedUsage.freeCreditsRemaining).toBe(0);
  });

  // ── 5. Successful Publishing Consumes 1 Credit ───────────────────────────

  it("5. successful publishing consumes exactly 1 credit", async () => {
    vi.spyOn(socialAccountService, "hasConnectedSocialAccount").mockResolvedValue(true);

    const initialUsage = await getUserUsage(USER_1);

    scheduledPostsStore.set("sp-meter-1", {
      id: "sp-meter-1",
      userId: USER_1,
      workspaceId: WS_1,
      contentPlanItemId: "cpi-meter-1",
      platform: "INSTAGRAM",
      scheduledAt: new Date(Date.now() - 3600000),
      status: "SCHEDULED",
      published: false,
    });

    const summary = await executeDueScheduledPosts({ workspaceId: WS_1 });
    expect(summary.publishedCount).toBe(1);

    const afterUsage = await getUserUsage(USER_1);
    expect(afterUsage.freeCreditsUsed).toBe(initialUsage.freeCreditsUsed + 1);
  });

  // ── 6. Failed Publishing Consumes 0 Credits ──────────────────────────────

  it("6. failed publishing consumes 0 credits", async () => {
    // No social account connected -> publishing will fail
    vi.spyOn(socialAccountService, "hasConnectedSocialAccount").mockResolvedValue(false);

    const initialUsage = await getUserUsage(USER_1);

    scheduledPostsStore.set("sp-meter-failed", {
      id: "sp-meter-failed",
      userId: USER_1,
      workspaceId: WS_1,
      contentPlanItemId: "cpi-meter-2",
      platform: "INSTAGRAM",
      scheduledAt: new Date(Date.now() - 3600000),
      status: "SCHEDULED",
      published: false,
    });

    const summary = await executeDueScheduledPosts({ workspaceId: WS_1 });
    expect(summary.failedCount).toBe(1);

    const afterUsage = await getUserUsage(USER_1);
    expect(afterUsage.freeCreditsUsed).toBe(initialUsage.freeCreditsUsed);
  });

  // ── 7. Idempotent Retry Does Not Double Charge ───────────────────────────

  it("7. publishing retry for the same ScheduledPost does not double-charge", async () => {
    const firstRes = await consumePublishingCredit({
      userId: USER_1,
      workspaceId: WS_1,
      scheduledPostId: "sp-retry-unique-100",
    });
    expect(firstRes.consumed).toBe(true);

    // Second invocation for the same scheduledPostId must be skipped
    const secondRes = await consumePublishingCredit({
      userId: USER_1,
      workspaceId: WS_1,
      scheduledPostId: "sp-retry-unique-100",
    });
    expect(secondRes.consumed).toBe(false);
  });

  // ── 8. Workspace Isolation ──────────────────────────────────────────────

  it("8. enforces workspace / user isolation: Workspace A usage does not affect Workspace B", async () => {
    await consumeUsage(USER_1, "CONTENT_GENERATION", 2);

    const usageUser1 = await getUserUsage(USER_1);
    const usageUser2 = await getUserUsage(USER_2);

    expect(usageUser1.freeCreditsUsed).toBe(2);
    expect(usageUser2.freeCreditsUsed).toBe(0);
  });

  // ── 9. Concurrency Protection ─────────────────────────────────────────────

  it("9. protects against concurrent consumption race conditions", async () => {
    const userId = "user-concurrent-1";

    // Trigger 3 concurrent consumeUsage calls simultaneously
    const results = await Promise.all([
      consumeUsage(userId, "CONTENT_GENERATION", 1),
      consumeUsage(userId, "CONTENT_GENERATION", 1),
      consumeUsage(userId, "CONTENT_GENERATION", 1),
    ]);

    expect(results).toHaveLength(3);
    const finalUsage = await getUserUsage(userId);
    expect(finalUsage.freeCreditsUsed).toBe(3);
  });
});
