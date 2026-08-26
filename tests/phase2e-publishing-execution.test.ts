/**
 * Phase 2E Part 1 — Publishing Execution Engine Unit & Integration Tests
 *
 * Requirements tested:
 *   1. Executes a due SCHEDULED post
 *   2. Creates PublishedPost record
 *   3. Updates ScheduledPost status to PUBLISHED
 *   4. Dispatches POST_PUBLISHED webhook
 *   5. Skips future ScheduledPost (where scheduledAt > now)
 *   6. Prevents duplicate execution (idempotency)
 *   7. Isolates workspaces (workspace A post not processed for workspace B)
 *   8. Continues processing remaining posts after one failed post
 *   9. Webhook failure does not undo publication
 *  10. Does NOT call any real social platform API (simulation mode)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  executeDueScheduledPosts,
  clearInMemoryPublishedPosts,
  getInMemoryPublishedPosts,
} from "../apps/api/src/services/publishing-service";
import {
  getInMemoryDeliveries,
  clearInMemoryDeliveries,
} from "../apps/api/src/services/webhook-service";

const { scheduledPostsStore, publishedPostsStore, contentPlanItemsStore } = vi.hoisted(() => ({
  scheduledPostsStore: new Map<string, any>(),
  publishedPostsStore: new Map<string, any>(),
  contentPlanItemsStore: new Map<string, any>(),
}));

vi.mock("@ai-social/database", () => {
  return {
    prisma: {
      scheduledPost: {
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          const lteTime = where?.scheduledAt?.lte
            ? new Date(where.scheduledAt.lte).getTime()
            : Date.now();

          const results: any[] = [];
          for (const post of scheduledPostsStore.values()) {
            if (where?.status && post.status !== where.status) continue;
            const postTime = new Date(post.scheduledAt).getTime();
            if (postTime > lteTime) continue;
            if (where?.workspaceId && post.workspaceId !== where.workspaceId) continue;
            if (where?.userId && post.userId !== where.userId) continue;

            const cloned = { ...post };
            cloned.publishedPost = publishedPostsStore.get(post.id) || null;
            cloned.contentPlanItem = contentPlanItemsStore.get(post.contentPlanItemId) || null;
            results.push(cloned);
          }

          // Sort by scheduledAt ASC
          results.sort(
            (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
          );
          return results;
        }),

        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = scheduledPostsStore.get(where.id);
          if (existing) {
            Object.assign(existing, data);
            scheduledPostsStore.set(where.id, existing);
            return existing;
          }
          throw new Error("ScheduledPost not found");
        }),
      },

      publishedPost: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const id = `pub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const published = {
            id,
            ...data,
            createdAt: new Date(),
          };
          if (data.scheduledPostId) {
            publishedPostsStore.set(data.scheduledPostId, published);
          }
          return published;
        }),

        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where?.scheduledPostId) {
            return publishedPostsStore.get(where.scheduledPostId) || null;
          }
          return null;
        }),
      },

      contentPlanItem: {
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const existing = contentPlanItemsStore.get(where.id);
          if (existing) {
            Object.assign(existing, data);
            contentPlanItemsStore.set(where.id, existing);
            return existing;
          }
          return { id: where.id, ...data };
        }),
      },

      n8nIntegration: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },

      n8nWebhookDelivery: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    },
  };
});

function getTestStores() {
  return { scheduledPostsStore, publishedPostsStore, contentPlanItemsStore };
}

function waitForAsync(ms = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const WS_A = "workspace-alpha-101";
const WS_B = "workspace-beta-202";
const USER_1 = "user-creator-1";
const NOW = new Date("2026-08-24T12:00:00Z");
const PAST_TIME = new Date("2026-08-24T10:00:00Z");
const FUTURE_TIME = new Date("2026-08-24T18:00:00Z");

import {
  connectSocialAccount,
  clearInMemorySocialAccounts,
} from "../apps/api/src/services/social-account-service";

describe("Phase 2E Part 1 — Publishing Execution Engine", () => {
  beforeEach(async () => {
    clearInMemoryPublishedPosts();
    clearInMemoryDeliveries();
    clearInMemorySocialAccounts();
    const { scheduledPostsStore, publishedPostsStore, contentPlanItemsStore } = getTestStores();
    scheduledPostsStore.clear();
    publishedPostsStore.clear();
    contentPlanItemsStore.clear();
    vi.clearAllMocks();

    // Register connected accounts for test workspaces so guard passes
    await connectSocialAccount({ workspaceId: WS_A, platform: "INSTAGRAM", externalAccountId: "acc-ig-a" });
    await connectSocialAccount({ workspaceId: WS_A, platform: "LINKEDIN", externalAccountId: "acc-li-a" });
    await connectSocialAccount({ workspaceId: WS_A, platform: "X", externalAccountId: "acc-x-a" });
    await connectSocialAccount({ workspaceId: WS_B, platform: "INSTAGRAM", externalAccountId: "acc-ig-b" });
  });

  afterEach(() => {
    clearInMemoryPublishedPosts();
    clearInMemoryDeliveries();
    clearInMemorySocialAccounts();
  });

  // ── 1. Executes a due SCHEDULED post ──────────────────────────────────────

  it("1. executes a due SCHEDULED post", async () => {
    const { scheduledPostsStore } = getTestStores();
    scheduledPostsStore.set("sp-due-1", {
      id: "sp-due-1",
      userId: USER_1,
      workspaceId: WS_A,
      contentPlanItemId: "cpi-1",
      platform: "INSTAGRAM",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    const summary = await executeDueScheduledPosts({ now: NOW });

    expect(summary.processed).toBe(1);
    expect(summary.publishedCount).toBe(1);
    expect(summary.failedCount).toBe(0);
    expect(summary.results[0].status).toBe("PUBLISHED");
    expect(summary.results[0].scheduledPostId).toBe("sp-due-1");
  });

  // ── 2. Creates PublishedPost record ───────────────────────────────────────

  it("2. creates PublishedPost record with externalPostId and permalink", async () => {
    const { scheduledPostsStore, publishedPostsStore } = getTestStores();
    scheduledPostsStore.set("sp-due-2", {
      id: "sp-due-2",
      userId: USER_1,
      workspaceId: WS_A,
      contentPlanItemId: "cpi-2",
      platform: "LINKEDIN",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    await executeDueScheduledPosts({ now: NOW });

    const publishedRecord = publishedPostsStore.get("sp-due-2");
    expect(publishedRecord).toBeDefined();
    expect(publishedRecord.scheduledPostId).toBe("sp-due-2");
    expect(publishedRecord.platform).toBe("LINKEDIN");
    expect(publishedRecord.externalPostId).toBe("sim_pub_sp-due-2");
    expect(publishedRecord.permalink).toBe("https://linkedin.com/p/sp-due-2");
  });

  // ── 3. Updates ScheduledPost status to PUBLISHED ─────────────────────────

  it("3. updates ScheduledPost status to PUBLISHED", async () => {
    const { scheduledPostsStore } = getTestStores();
    scheduledPostsStore.set("sp-due-3", {
      id: "sp-due-3",
      userId: USER_1,
      workspaceId: WS_A,
      contentPlanItemId: "cpi-3",
      platform: "X",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    await executeDueScheduledPosts({ now: NOW });

    const updated = scheduledPostsStore.get("sp-due-3");
    expect(updated.status).toBe("PUBLISHED");
    expect(updated.published).toBe(true);
  });

  // ── 4. Dispatches POST_PUBLISHED webhook ──────────────────────────────────

  it("4. dispatches POST_PUBLISHED webhook event", async () => {
    const { prisma } = await import("@ai-social/database");
    const { scheduledPostsStore } = getTestStores();

    // Mock n8n integration for WS_A
    vi.mocked(prisma.n8nIntegration.findMany).mockResolvedValueOnce([
      {
        id: "int-pub-001",
        workspaceId: WS_A,
        webhookUrlEncrypted: "plain:http://fake-n8n.test/post-published",
        secretEncrypted: "plain:pub-secret",
      } as any,
    ]);

    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => "ok",
    });
    global.fetch = fetchMock as any;

    scheduledPostsStore.set("sp-webhook-1", {
      id: "sp-webhook-1",
      userId: USER_1,
      workspaceId: WS_A,
      contentPlanItemId: "cpi-webhook",
      platform: "INSTAGRAM",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    await executeDueScheduledPosts({ workspaceId: WS_A, now: NOW });
    await waitForAsync(150);

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.eventType).toBe("POST_PUBLISHED");
    expect(body.workspaceId).toBe(WS_A);
    expect(body.data.scheduledPostId).toBe("sp-webhook-1");
    expect(body.data.platform).toBe("INSTAGRAM");
  });

  // ── 5. Skips future ScheduledPost ─────────────────────────────────────────

  it("5. skips future ScheduledPost where scheduledAt > now", async () => {
    const { scheduledPostsStore } = getTestStores();

    scheduledPostsStore.set("sp-future-1", {
      id: "sp-future-1",
      userId: USER_1,
      workspaceId: WS_A,
      contentPlanItemId: "cpi-future",
      platform: "INSTAGRAM",
      scheduledAt: FUTURE_TIME, // In future
      status: "SCHEDULED",
      published: false,
    });

    const summary = await executeDueScheduledPosts({ now: NOW });

    expect(summary.processed).toBe(0);
    expect(summary.publishedCount).toBe(0);

    const post = scheduledPostsStore.get("sp-future-1");
    expect(post.status).toBe("SCHEDULED"); // Unchanged
    expect(post.published).toBe(false);
  });

  // ── 6. Prevents duplicate execution (idempotency) ─────────────────────────

  it("6. prevents duplicate execution when called twice (idempotency)", async () => {
    const { scheduledPostsStore, publishedPostsStore } = getTestStores();

    scheduledPostsStore.set("sp-idem-1", {
      id: "sp-idem-1",
      userId: USER_1,
      workspaceId: WS_A,
      contentPlanItemId: "cpi-idem",
      platform: "INSTAGRAM",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    // First call: publishes the post
    const summary1 = await executeDueScheduledPosts({ now: NOW });
    expect(summary1.publishedCount).toBe(1);

    // Second call: post status is now PUBLISHED, so findMany query filters it out or execution skips it
    const summary2 = await executeDueScheduledPosts({ now: NOW });
    expect(summary2.publishedCount).toBe(0);

    // Verify only ONE PublishedPost record exists
    expect(publishedPostsStore.size).toBe(1);
  });

  // ── 7. Isolates workspaces ────────────────────────────────────────────────

  it("7. isolates workspaces: workspace A execution does not process workspace B posts", async () => {
    const { scheduledPostsStore } = getTestStores();

    scheduledPostsStore.set("sp-ws-a", {
      id: "sp-ws-a",
      userId: USER_1,
      workspaceId: WS_A,
      platform: "INSTAGRAM",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    scheduledPostsStore.set("sp-ws-b", {
      id: "sp-ws-b",
      userId: USER_1,
      workspaceId: WS_B,
      platform: "INSTAGRAM",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    // Execute for Workspace A only
    const summaryA = await executeDueScheduledPosts({ workspaceId: WS_A, now: NOW });
    expect(summaryA.processed).toBe(1);
    expect(summaryA.results[0].scheduledPostId).toBe("sp-ws-a");

    // Workspace B post must remain SCHEDULED
    expect(scheduledPostsStore.get("sp-ws-b").status).toBe("SCHEDULED");
    expect(scheduledPostsStore.get("sp-ws-a").status).toBe("PUBLISHED");
  });

  // ── 8. Continues processing after one failed post ─────────────────────────

  it("8. continues processing remaining posts after one failed post", async () => {
    const { scheduledPostsStore, publishedPostsStore } = getTestStores();
    const { prisma } = await import("@ai-social/database");

    scheduledPostsStore.set("sp-fail-1", {
      id: "sp-fail-1",
      userId: USER_1,
      workspaceId: WS_A,
      platform: "INSTAGRAM",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    scheduledPostsStore.set("sp-success-2", {
      id: "sp-success-2",
      userId: USER_1,
      workspaceId: WS_A,
      platform: "LINKEDIN",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    // Cause prisma.publishedPost.create to throw on sp-fail-1
    vi.mocked(prisma.publishedPost.create).mockImplementationOnce(async () => {
      throw new Error("Simulated database failure for item 1");
    });

    const summary = await executeDueScheduledPosts({ workspaceId: WS_A, now: NOW });

    expect(summary.processed).toBe(2);
    expect(summary.failedCount).toBe(1);
    expect(summary.publishedCount).toBe(1);

    // Second post succeeded despite first post's failure
    expect(summary.results[1].scheduledPostId).toBe("sp-success-2");
    expect(summary.results[1].status).toBe("PUBLISHED");
  });

  // ── 9. Webhook failure does not undo publication ──────────────────────────

  it("9. webhook failure does not undo publication", async () => {
    const { prisma } = await import("@ai-social/database");
    const { scheduledPostsStore, publishedPostsStore } = getTestStores();

    // Mock n8n integration
    vi.mocked(prisma.n8nIntegration.findMany).mockResolvedValueOnce([
      {
        id: "int-err",
        workspaceId: WS_A,
        webhookUrlEncrypted: "plain:http://fake-n8n.test/fail",
        secretEncrypted: "plain:secret",
      } as any,
    ]);

    // Simulate failing fetch
    global.fetch = vi.fn().mockRejectedValue(new Error("Network connection lost")) as any;

    scheduledPostsStore.set("sp-wh-fail", {
      id: "sp-wh-fail",
      userId: USER_1,
      workspaceId: WS_A,
      platform: "INSTAGRAM",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    const summary = await executeDueScheduledPosts({ workspaceId: WS_A, now: NOW });
    await waitForAsync(150);

    // Publication succeeded despite webhook failure
    expect(summary.publishedCount).toBe(1);
    expect(summary.results[0].status).toBe("PUBLISHED");
    expect(publishedPostsStore.has("sp-wh-fail")).toBe(true);
    expect(scheduledPostsStore.get("sp-wh-fail").status).toBe("PUBLISHED");
  });

  // ── 10. Does NOT call any real social platform API ────────────────────────

  it("10. does not call any real social platform API (simulation mode)", async () => {
    const { scheduledPostsStore } = getTestStores();
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;

    scheduledPostsStore.set("sp-sim-1", {
      id: "sp-sim-1",
      userId: USER_1,
      workspaceId: WS_A,
      platform: "INSTAGRAM",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    await executeDueScheduledPosts({ workspaceId: WS_A, now: NOW });

    // Ensure no calls were made to graph.instagram.com, api.linkedin.com, api.twitter.com, etc.
    const calls = fetchSpy.mock.calls;
    for (const [url] of calls) {
      expect(url).not.toContain("graph.facebook.com");
      expect(url).not.toContain("graph.instagram.com");
      expect(url).not.toContain("api.linkedin.com");
      expect(url).not.toContain("api.twitter.com");
      expect(url).not.toContain("api.x.com");
    }
  });
});
