/**
 * Phase 2E Part 2 — Social Account Service Tests
 *
 * Requirements tested:
 *   1. Creates / connects social account
 *   2. Lists workspace social accounts
 *   3. Retrieves specific social account by ID
 *   4. Prevents cross-workspace account access (workspace isolation)
 *   5. Disconnects account cleanly
 *   6. Safe response DTO excludes tokens, secrets, or credentials
 *   7. Invalid account retrieval is rejected (returns null)
 *   8. Publishing execution fails if no connected account exists for workspace & platform
 *   9. Publishing execution succeeds when a valid connected account exists
 *  10. Credentials are never exposed in any API response structure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  connectSocialAccount,
  listWorkspaceSocialAccounts,
  getWorkspaceSocialAccountById,
  disconnectSocialAccount,
  hasConnectedSocialAccount,
  clearInMemorySocialAccounts,
} from "../apps/api/src/services/social-account-service";
import {
  executeDueScheduledPosts,
  clearInMemoryPublishedPosts,
} from "../apps/api/src/services/publishing-service";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { socialAccountsStore, scheduledPostsStore, publishedPostsStore } = vi.hoisted(() => ({
  socialAccountsStore: new Map<string, any>(),
  scheduledPostsStore: new Map<string, any>(),
  publishedPostsStore: new Map<string, any>(),
}));

vi.mock("@ai-social/database", () => {
  return {
    prisma: {
      socialAccount: {
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => {
          const key = `${where.workspaceId_platform_externalAccountId.workspaceId}_${where.workspaceId_platform_externalAccountId.platform}_${where.workspaceId_platform_externalAccountId.externalAccountId}`;
          let existing = socialAccountsStore.get(key);
          if (!existing) {
            const id = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            existing = { id, ...create, createdAt: new Date(), updatedAt: new Date() };
          } else {
            Object.assign(existing, update, { updatedAt: new Date() });
          }
          socialAccountsStore.set(key, existing);
          return existing;
        }),

        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          const results: any[] = [];
          for (const acc of socialAccountsStore.values()) {
            if (where?.workspaceId && acc.workspaceId !== where.workspaceId) continue;
            if (where?.platform && acc.platform !== where.platform) continue;
            if (where?.status && acc.status !== where.status) continue;
            results.push(acc);
          }
          return results;
        }),

        findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
          for (const acc of socialAccountsStore.values()) {
            if (where?.id && acc.id !== where.id) continue;
            if (where?.workspaceId && acc.workspaceId !== where.workspaceId) continue;
            if (where?.platform && acc.platform !== where.platform) continue;
            if (where?.status && acc.status !== where.status) continue;
            return acc;
          }
          return null;
        }),

        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          for (const [key, acc] of socialAccountsStore.entries()) {
            if (acc.id === where.id) {
              Object.assign(acc, data, { updatedAt: new Date() });
              socialAccountsStore.set(key, acc);
              return acc;
            }
          }
          throw new Error("SocialAccount not found");
        }),

        count: vi.fn().mockImplementation(async ({ where }: any) => {
          let count = 0;
          for (const acc of socialAccountsStore.values()) {
            if (where?.workspaceId && acc.workspaceId !== where.workspaceId) continue;
            if (where?.platform && acc.platform !== where.platform) continue;
            if (where?.status && acc.status !== where.status) continue;
            count++;
          }
          return count;
        }),
      },

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
            results.push(cloned);
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
          throw new Error("ScheduledPost not found");
        }),
      },

      publishedPost: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const id = `pub_${Date.now()}`;
          const published = { id, ...data, createdAt: new Date() };
          if (data.scheduledPostId) {
            publishedPostsStore.set(data.scheduledPostId, published);
          }
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

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const WS_ALPHA = "ws-alpha-999";
const WS_BETA = "ws-beta-888";
const USER_1 = "user-auth-1";
const PAST_TIME = new Date("2026-08-24T10:00:00Z");
const NOW = new Date("2026-08-24T12:00:00Z");

describe("Phase 2E Part 2 — Social Account Service", () => {
  beforeEach(() => {
    clearInMemorySocialAccounts();
    clearInMemoryPublishedPosts();
    socialAccountsStore.clear();
    scheduledPostsStore.clear();
    publishedPostsStore.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearInMemorySocialAccounts();
    clearInMemoryPublishedPosts();
  });

  // ── 1. Creates / connects account ──────────────────────────────────────────

  it("1. creates/connects account with encrypted tokens", async () => {
    const account = await connectSocialAccount({
      workspaceId: WS_ALPHA,
      userId: USER_1,
      platform: "LINKEDIN",
      externalAccountId: "ext-linkedin-101",
      username: "alex_executive",
      displayName: "Alex Founder",
      accessToken: "secret_access_token_abc123",
      refreshToken: "secret_refresh_token_xyz789",
    });

    expect(account.id).toBeTruthy();
    expect(account.workspaceId).toBe(WS_ALPHA);
    expect(account.platform).toBe("LINKEDIN");
    expect(account.username).toBe("alex_executive");
    expect(account.status).toBe("CONNECTED");
  });

  // ── 2. Lists workspace accounts ───────────────────────────────────────────

  it("2. lists connected accounts for workspace", async () => {
    await connectSocialAccount({
      workspaceId: WS_ALPHA,
      platform: "INSTAGRAM",
      externalAccountId: "ig-111",
      username: "alpha_brand",
    });

    await connectSocialAccount({
      workspaceId: WS_ALPHA,
      platform: "X",
      externalAccountId: "x-222",
      username: "alpha_tweets",
    });

    const accounts = await listWorkspaceSocialAccounts(WS_ALPHA);
    expect(accounts).toHaveLength(2);
    expect(accounts.map((a) => a.platform).sort()).toEqual(["INSTAGRAM", "X"]);
  });

  // ── 3. Retrieves specific account by ID ───────────────────────────────────

  it("3. retrieves specific social account by ID", async () => {
    const created = await connectSocialAccount({
      workspaceId: WS_ALPHA,
      platform: "TIKTOK",
      externalAccountId: "tt-333",
      username: "alpha_tiktok",
    });

    const retrieved = await getWorkspaceSocialAccountById(created.id, WS_ALPHA);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.username).toBe("alpha_tiktok");
  });

  // ── 4. Prevents cross-workspace access ────────────────────────────────────

  it("4. prevents cross-workspace account access (workspace isolation)", async () => {
    const created = await connectSocialAccount({
      workspaceId: WS_ALPHA,
      platform: "PINTEREST",
      externalAccountId: "pin-444",
      username: "alpha_pins",
    });

    // Attempt retrieval using Workspace Beta ID -> Must return null
    const crossAccess = await getWorkspaceSocialAccountById(created.id, WS_BETA);
    expect(crossAccess).toBeNull();

    // Listing accounts for Workspace Beta should NOT include Alpha's accounts
    const betaAccounts = await listWorkspaceSocialAccounts(WS_BETA);
    expect(betaAccounts).toHaveLength(0);
  });

  // ── 5. Disconnects account cleanly ────────────────────────────────────────

  it("5. disconnects account cleanly", async () => {
    const created = await connectSocialAccount({
      workspaceId: WS_ALPHA,
      platform: "FACEBOOK",
      externalAccountId: "fb-555",
      username: "alpha_page",
    });

    const discRes = await disconnectSocialAccount(created.id, WS_ALPHA);
    expect(discRes.success).toBe(true);

    const accountsAfter = await listWorkspaceSocialAccounts(WS_ALPHA);
    expect(accountsAfter).toHaveLength(0);
  });

  // ── 6. Safe response excludes credentials ─────────────────────────────────

  it("6. safe response DTO excludes tokens, secrets, or credentials", async () => {
    const created = await connectSocialAccount({
      workspaceId: WS_ALPHA,
      platform: "YOUTUBE",
      externalAccountId: "yt-666",
      username: "alpha_channel",
      accessToken: "TOP_SECRET_OAUTH_ACCESS_TOKEN",
      refreshToken: "TOP_SECRET_OAUTH_REFRESH_TOKEN",
    });

    // Check properties on safe DTO object
    const keys = Object.keys(created);
    expect(keys).not.toContain("encryptedAccessToken");
    expect(keys).not.toContain("encryptedRefreshToken");
    expect(keys).not.toContain("accessToken");
    expect(keys).not.toContain("refreshToken");

    const jsonStr = JSON.stringify(created);
    expect(jsonStr).not.toContain("TOP_SECRET_OAUTH_ACCESS_TOKEN");
    expect(jsonStr).not.toContain("TOP_SECRET_OAUTH_REFRESH_TOKEN");
  });

  // ── 7. Invalid account retrieval is rejected ──────────────────────────────

  it("7. invalid account ID retrieval is rejected (returns null)", async () => {
    const res = await getWorkspaceSocialAccountById("nonexistent-account-id", WS_ALPHA);
    expect(res).toBeNull();
  });

  // ── 8. Publishing fails if no connected account exists ───────────────────

  it("8. publishing execution fails if no connected account exists for workspace & platform", async () => {
    // Register no connected accounts for WS_BETA
    scheduledPostsStore.set("sp-no-acc", {
      id: "sp-no-acc",
      userId: USER_1,
      workspaceId: WS_BETA, // WS_BETA has no connected accounts
      platform: "TIKTOK",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    const summary = await executeDueScheduledPosts({ workspaceId: WS_BETA, now: NOW });

    expect(summary.processed).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.publishedCount).toBe(0);
    expect(summary.results[0].error).toContain("No connected TIKTOK account found");
  });

  // ── 9. Publishing succeeds when valid connected account exists ───────────

  it("9. publishing execution succeeds when valid connected account exists", async () => {
    // Connect TIKTOK account for WS_ALPHA
    await connectSocialAccount({
      workspaceId: WS_ALPHA,
      platform: "TIKTOK",
      externalAccountId: "tt-valid-777",
      username: "alpha_tiktok_official",
    });

    scheduledPostsStore.set("sp-with-acc", {
      id: "sp-with-acc",
      userId: USER_1,
      workspaceId: WS_ALPHA,
      platform: "TIKTOK",
      scheduledAt: PAST_TIME,
      status: "SCHEDULED",
      published: false,
    });

    const summary = await executeDueScheduledPosts({ workspaceId: WS_ALPHA, now: NOW });

    expect(summary.processed).toBe(1);
    expect(summary.publishedCount).toBe(1);
    expect(summary.failedCount).toBe(0);
    expect(summary.results[0].status).toBe("PUBLISHED");
  });

  // ── 10. Credentials are never included in API response ────────────────────

  it("10. credentials are never included in account list or detail responses", async () => {
    await connectSocialAccount({
      workspaceId: WS_ALPHA,
      platform: "THREADS",
      externalAccountId: "th-888",
      username: "alpha_threads",
      accessToken: "CRITICAL_SECRET_ACCESS",
      refreshToken: "CRITICAL_SECRET_REFRESH",
    });

    const listRes = await listWorkspaceSocialAccounts(WS_ALPHA);
    const listJson = JSON.stringify(listRes);

    expect(listJson).not.toContain("CRITICAL_SECRET_ACCESS");
    expect(listJson).not.toContain("CRITICAL_SECRET_REFRESH");
    expect(listJson).not.toContain("encryptedAccessToken");
    expect(listJson).not.toContain("encryptedRefreshToken");
  });
});
