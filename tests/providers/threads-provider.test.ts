import { describe, expect, it, vi, beforeEach } from "vitest";
import { ThreadsProvider } from "../../apps/api/src/integrations/social-engine/providers/threads-provider.js";
import { providerRegistry } from "../../apps/api/src/integrations/social-engine/providers/provider-registry.js";
import { socialAccountService } from "../../apps/api/src/integrations/social-engine/account-service.js";
import { socialPublishingService } from "../../apps/api/src/integrations/social-engine/publishing-service.js";
import { universalAnalyticsProvider } from "../../apps/api/src/integrations/social-engine/analytics-provider.js";
import { generateSignedOAuthState, verifyOAuthState, encryptSecret, decryptSecret } from "../../apps/api/src/utils/encryption.js";
import type { PlatformContentData, SocialAccountData } from "../types";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

const mockThreadsAccount: SocialAccountData = {
  id: "acc-threads-test-1",
  workspaceId: "ws-threads-1",
  platform: "THREADS",
  externalAccountId: "threads-user-12345",
  username: "@tech_creator",
  displayName: "Tech Creator",
  accountType: "STANDARD",
  status: "CONNECTED",
  encryptedAccessToken: encryptSecret("mock-threads-token-999"),
  encryptedRefreshToken: null,
  tokenExpiresAt: new Date(Date.now() + 86400 * 1000),
  metadataJson: null,
  connectedAt: new Date(),
  updatedAt: new Date(),
  createdAt: new Date(),
};

const mockApprovedThreadsContent: PlatformContentData = {
  id: "content-threads-1",
  workspaceId: "ws-threads-1",
  campaignId: "camp-threads-1",
  assetId: "asset-threads-1",
  platform: "THREADS",
  socialAccountId: "acc-threads-test-1",
  contentType: "TEACHING",
  caption: "Quick masterclass on building responsive AI interfaces. What's your top layout tip?",
  title: "Responsive AI Interfaces",
  description: "Masterclass takeaways",
  hashtagsJson: ["#tech", "#creators"],
  keywordsJson: ["tech", "ai"],
  cta: "Reply with your thoughts!",
  altText: "AI design banner",
  destinationUrl: "https://example.com/guide",
  platformMetadataJson: null,
  status: "READY",
  approvalStatus: "APPROVED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Threads Production Engine & Provider Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Provider Registry Resolution: resolves ThreadsProvider", () => {
    const provider = providerRegistry.getProvider("THREADS");
    expect(provider).toBeDefined();
    expect(provider.platform).toBe("THREADS");
    expect(provider.getCapabilities()).toContain("TEXT");
    expect(provider.getCapabilities()).toContain("IMAGE_POST");
    expect(provider.getCapabilities()).toContain("HASHTAGS");
  });

  it("2. OAuth State Protection & CSRF Verification", () => {
    const state = generateSignedOAuthState("ws-threads-security", "user-threads-77");
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(20);

    const verified = verifyOAuthState(state);
    expect(verified.workspaceId).toBe("ws-threads-security");
    expect(verified.userId).toBe("user-threads-77");
  });

  it("3. Token Encryption and Decryption Integrity", () => {
    const rawToken = "secret-threads-token-abc-123";
    const encrypted = encryptSecret(rawToken);
    expect(encrypted).not.toBe(rawToken);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("4. Duplicate Account Connection Prevention", async () => {
    const wsId = "ws-threads-dup";
    const acc1 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "THREADS",
      externalAccountId: "threads-usr-99",
      username: "@design_hub",
      accessToken: "token-v1",
    });

    const acc2 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "THREADS",
      externalAccountId: "threads-usr-99",
      username: "@design_hub_updated",
      accessToken: "token-v2",
    });

    expect(acc1.id).toBe(acc2.id); // Same ID updated
    const accounts = await socialAccountService.listWorkspaceAccounts(wsId);
    expect(accounts.filter((a) => a.platform === "THREADS").length).toBe(1);
    expect(accounts[0].username).toBe("@design_hub_updated");
  });

  it("5. Token Expiration and Automatic Refresh Exchange", async () => {
    const provider = new ThreadsProvider();

    const expiredAccount: SocialAccountData = {
      ...mockThreadsAccount,
      id: "acc-threads-exp-1",
      tokenExpiresAt: new Date(Date.now() - 10000), // Expired
      encryptedAccessToken: encryptSecret("old-threads-token"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "new-refreshed-threads-token-555",
            expires_in: 5184000,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const newToken = await provider.getValidAccessToken(expiredAccount);
    expect(newToken).toBe("new-refreshed-threads-token-555");
    vi.unstubAllGlobals();
  });

  it("6. Failed Token Refresh Marks Account as REAUTH_REQUIRED", async () => {
    const provider = new ThreadsProvider();

    const expiredAccount: SocialAccountData = {
      ...mockThreadsAccount,
      id: "acc-threads-revoked-1",
      workspaceId: "ws-threads-revoked",
      tokenExpiresAt: new Date(Date.now() - 10000),
      encryptedAccessToken: encryptSecret("revoked-token"),
    };

    await socialAccountService.connectAccount({
      workspaceId: "ws-threads-revoked",
      platform: "THREADS",
      externalAccountId: "threads-revoked-99",
      username: "@revoked_user",
      accessToken: "revoked-token",
      tokenExpiresAt: new Date(Date.now() - 10000),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("OAuthException: Token revoked", { status: 401 }))
    );

    await expect(provider.getValidAccessToken(expiredAccount)).rejects.toThrow(
      /Re-authentication required/
    );

    vi.unstubAllGlobals();
  });

  it("7. Human Approval Guard: Fails if content is PENDING", async () => {
    const provider = new ThreadsProvider();
    const result = await provider.publish({
      workspaceId: "ws-threads-1",
      platform: "THREADS",
      account: mockThreadsAccount,
      content: { ...mockApprovedThreadsContent, approvalStatus: "PENDING" },
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/human approval/i);
  });

  it("8. Mock Mode Text and Image Publishing", async () => {
    vi.stubEnv("RUN_REAL_THREADS_TEST", "false");
    const provider = new ThreadsProvider();

    const result = await provider.publish({
      workspaceId: "ws-threads-1",
      platform: "THREADS",
      account: mockThreadsAccount,
      content: mockApprovedThreadsContent,
      mediaUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toMatch(/^threads-post-/);
    expect(result.permalink).toContain("threads.net/post/");

    vi.unstubAllEnvs();
  });

  it("9. Real API Live Publishing Flow (Mocked Network)", async () => {
    vi.stubEnv("RUN_REAL_THREADS_TEST", "true");
    const provider = new ThreadsProvider();

    const fetchMock = vi.fn().mockImplementation(async (input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as { url?: string })?.url || String(input);

      if (url.includes("/threads_publish")) {
        return new Response(JSON.stringify({ id: "threads-post-pub-889900" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("fields=status")) {
        return new Response(JSON.stringify({ status: "FINISHED" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/threads")) {
        return new Response(JSON.stringify({ id: "container-threads-1122" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.publish({
      workspaceId: "ws-threads-1",
      platform: "THREADS",
      account: mockThreadsAccount,
      content: mockApprovedThreadsContent,
      mediaUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe("threads-post-pub-889900");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("10. Failed Threads API Error Classification (Retryable vs Fatal)", async () => {
    vi.stubEnv("RUN_REAL_THREADS_TEST", "true");
    const provider = new ThreadsProvider();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Threads Server Error", { status: 503 })
      )
    );

    const result503 = await provider.publish({
      workspaceId: "ws-threads-1",
      platform: "THREADS",
      account: mockThreadsAccount,
      content: mockApprovedThreadsContent,
    });

    expect(result503.success).toBe(false);
    expect(result503.errorMessage).toContain("[Retryable]");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("11. Universal Scheduled Publication Workflow Dispatch", async () => {
    const result = await socialPublishingService.publishContent({
      workspaceId: "ws-threads-1",
      account: mockThreadsAccount,
      content: mockApprovedThreadsContent,
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBeDefined();
  });

  it("12. Threads Analytics Insights Fetching", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          data: [
            { name: "views", values: [{ value: 1250 }] },
            { name: "likes", values: [{ value: 120 }] },
            { name: "replies", values: [{ value: 35 }] },
            { name: "reposts", values: [{ value: 15 }] },
            { name: "quotes", values: [{ value: 5 }] },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const res = await universalAnalyticsProvider.fetchAnalytics(
      "THREADS",
      "threads-post-pub-889900",
      "valid-threads-insights-token"
    );

    expect(res.available).toBe(true);
    expect(res.metrics?.impressions).toBe(1250);
    expect(res.metrics?.likes).toBe(120);
    expect(res.metrics?.comments).toBe(35);
    expect(res.metrics?.shares).toBe(20); // 15 reposts + 5 quotes
    expect(res.metrics?.engagements).toBe(175); // 120 + 35 + 20

    vi.unstubAllGlobals();
  });
});
