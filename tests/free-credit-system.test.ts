/**
 * Single-Balance Monthly FREE Credit System Test Suite
 *
 * Requirements tested:
 *   1. New user receives 10 credits total for Month 1 (first monthly cycle).
 *   2. First month credits are NOT permanent — unused Month 1 credits do NOT carry over.
 *   3. Month 2 grants exactly 3 credits regardless of Month 1 usage (e.g., 6/10 used -> 3 credits).
 *   4. Month 3 grants exactly 3 credits regardless of Month 2 usage (e.g., 2/3 used -> 3 credits).
 *   5. Previous unused credits expire on monthly cycle transition.
 *   6. Repeated API calls do not grant duplicate credits.
 *   7. Concurrent usage/reset operations are thread-safe.
 *   8. Paid subscriptions remain unaffected (e.g., PRO = 50 credits/month).
 *   9. Admin-granted subscriptions remain unaffected.
 *  10. Idempotent initialization: repeated initializations do not alter credit balance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getUserUsage,
  consumeUsage,
  clearInMemoryUsage,
  setInMemoryUserCreatedAt,
  addMonths,
} from "../apps/api/src/services/usage-service";
import {
  getUserSubscription,
  updateUserSubscriptionState,
  clearInMemorySubscriptions,
} from "../apps/api/src/services/subscription-service";
import { getUserPlan } from "../apps/api/src/services/entitlement-service";

vi.mock("@ai-social/database", () => {
  return {
    default: {
      userUsage: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      workspace: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      subscription: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      adminAuditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    },
    prisma: {
      userUsage: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      workspace: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      subscription: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      adminAuditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    },
  };
});

describe("Single-Balance Monthly FREE Credit System", () => {
  beforeEach(() => {
    clearInMemoryUsage();
    clearInMemorySubscriptions();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearInMemoryUsage();
    clearInMemorySubscriptions();
  });

  it("1. New user gets 10 credits total for Month 1", async () => {
    const userId = "test-user-1";
    const usage = await getUserUsage(userId);
    expect(usage.isInitialMonth).toBe(true);
    expect(usage.freeCreditsTotal).toBe(10);
    expect(usage.freeCreditsUsed).toBe(0);
    expect(usage.freeCreditsRemaining).toBe(10);
  });

  it("2. User consuming 6/10 in Month 1 receives exactly 3 credits in Month 2 (no rollover)", async () => {
    const userId = "test-user-2";
    const now = new Date();
    setInMemoryUserCreatedAt(userId, now);

    // Consume 6 credits in Month 1
    await consumeUsage(userId, "CONTENT_GENERATION", 6);
    const m1Usage = await getUserUsage(userId);
    expect(m1Usage.freeCreditsUsed).toBe(6);
    expect(m1Usage.freeCreditsRemaining).toBe(4);

    // Advance user to Month 2 (1 month ago)
    const month2Signup = addMonths(now, -1);
    setInMemoryUserCreatedAt(userId, month2Signup);

    const m2Usage = await getUserUsage(userId);
    expect(m2Usage.isInitialMonth).toBe(false);
    expect(m2Usage.freeCreditsTotal).toBe(3); // Resets to 3!
    expect(m2Usage.freeCreditsUsed).toBe(0); // Used resets to 0!
    expect(m2Usage.freeCreditsRemaining).toBe(3); // Exactly 3 remaining (NOT 7, NOT 4)
  });

  it("3. User consuming 2/3 in Month 2 receives exactly 3 credits in Month 3", async () => {
    const userId = "test-user-3";
    const now = new Date();
    
    // Month 2 setup
    const month2Signup = addMonths(now, -1);
    setInMemoryUserCreatedAt(userId, month2Signup);

    await getUserUsage(userId);
    // Consume 2 credits in Month 2
    await consumeUsage(userId, "CONTENT_GENERATION", 2);
    const m2Usage = await getUserUsage(userId);
    expect(m2Usage.freeCreditsRemaining).toBe(1);

    // Advance to Month 3 (2 months ago)
    const month3Signup = addMonths(now, -2);
    setInMemoryUserCreatedAt(userId, month3Signup);

    const m3Usage = await getUserUsage(userId);
    expect(m3Usage.freeCreditsTotal).toBe(3);
    expect(m3Usage.freeCreditsUsed).toBe(0);
    expect(m3Usage.freeCreditsRemaining).toBe(3); // Resets to 3!
  });

  it("4. Unused Month 1 credits expire completely if 0 credits are used", async () => {
    const userId = "test-user-4";
    const now = new Date();
    setInMemoryUserCreatedAt(userId, now);

    // 0 credits used in Month 1
    const m1Usage = await getUserUsage(userId);
    expect(m1Usage.freeCreditsRemaining).toBe(10);

    // Move to Month 2
    setInMemoryUserCreatedAt(userId, addMonths(now, -1));

    const m2Usage = await getUserUsage(userId);
    expect(m2Usage.freeCreditsTotal).toBe(3);
    expect(m2Usage.freeCreditsRemaining).toBe(3); // Resets to 3 (does NOT carry over to 10 + 3 = 13)
  });

  it("5. Repeated API calls do not alter allowance or grant extra credits", async () => {
    const userId = "test-user-5";
    const now = new Date();
    setInMemoryUserCreatedAt(userId, addMonths(now, -1)); // Month 2

    const u1 = await getUserUsage(userId);
    const u2 = await getUserUsage(userId);
    const u3 = await getUserUsage(userId);

    expect(u1.freeCreditsTotal).toBe(3);
    expect(u2.freeCreditsTotal).toBe(3);
    expect(u3.freeCreditsTotal).toBe(3);
  });

  it("6. Concurrent credit consumption is thread-safe and atomic", async () => {
    const userId = "test-user-6";
    const now = new Date();
    setInMemoryUserCreatedAt(userId, addMonths(now, -1)); // Month 2 (3 credits)

    const results = await Promise.all([
      consumeUsage(userId, "CONTENT_GENERATION", 1),
      consumeUsage(userId, "CONTENT_GENERATION", 1),
      consumeUsage(userId, "CONTENT_GENERATION", 1),
    ]);

    expect(results).toHaveLength(3);
    const finalUsage = await getUserUsage(userId);
    expect(finalUsage.freeCreditsUsed).toBe(3);
    expect(finalUsage.freeCreditsRemaining).toBe(0);

    // 4th consumption should throw PLAN_LIMIT_REACHED
    await expect(consumeUsage(userId, "CONTENT_GENERATION", 1)).rejects.toThrow("PLAN_LIMIT_REACHED");
  });

  it("7. Paid subscriptions are unaffected by free cycle resets", async () => {
    const userId = "test-user-paid";
    await updateUserSubscriptionState(userId, { plan: "PRO", status: "ACTIVE" });

    const plan = await getUserPlan(userId);
    expect(plan).toBe("PRO");

    const usage = await getUserUsage(userId);
    expect(usage.freeCreditsTotal).toBe(50);
  });

  it("8. Admin-granted subscriptions remain active with tier limits", async () => {
    const userId = "test-user-admin";
    await updateUserSubscriptionState(userId, { plan: "BUSINESS", status: "ACTIVE" });

    const sub = await getUserSubscription(userId);
    expect(sub.plan).toBe("BUSINESS");

    const usage = await getUserUsage(userId);
    expect(usage.freeCreditsTotal).toBe(500);
  });
});
