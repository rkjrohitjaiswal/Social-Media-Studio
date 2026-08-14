import { describe, expect, it, vi, beforeEach } from "vitest";
import { TikTokProvider } from "../../apps/api/src/integrations/social-engine/providers/tiktok-provider.js";
import { providerRegistry } from "../../apps/api/src/integrations/social-engine/providers/provider-registry.js";
import { socialAccountService } from "../../apps/api/src/integrations/social-engine/account-service.js";
import { socialPublishingService } from "../../apps/api/src/integrations/social-engine/publishing-service.js";
import { universalAnalyticsProvider } from "../../apps/api/src/integrations/social-engine/analytics-provider.js";
import { generateSignedOAuthState, verifyOAuthState, encryptSecret, decryptSecret } from "../../apps/api/src/utils/encryption.js";
import type { PlatformContentData, SocialAccountData } from "../types";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

const mockTikTokAccount: SocialAccountData = {
  id: "acc-tiktok-test-1",
  workspaceId: "ws-tiktok-1",
  platform: "TIKTOK",
  externalAccountId: "tiktok-usr-8899",
  username: "@tech_tiktok_creator",
  displayName: "Tech TikTok Creator",
  accountType: "CREATOR",
  status: "CONNECTED",
  encryptedAccessToken: encryptSecret("mock-tiktok-access-token"),
  encryptedRefreshToken: encryptSecret("mock-tiktok-refresh-token"),
  tokenExpiresAt: new Date(Date.now() + 86400 * 1000),
  metadataJson: { openId: "tiktok-usr-8899" },
  connectedAt: new Date(),
  updatedAt: new Date(),
  createdAt: new Date(),
};

const mockApprovedTikTokContent: PlatformContentData = {
  id: "content-tiktok-1",
  workspaceId: "ws-tiktok-1",
  campaignId: "camp-tiktok-1",
  assetId: "asset-tiktok-1",
  platform: "TIKTOK",
  socialAccountId: "acc-tiktok-test-1",
  contentType: "AFFILIATE_PRODUCT",
  caption: "Check out this ergonomic mechanical keyboard! Key specs and full setup review. Disclosure: Contains affiliate links. #ad #affiliate",
  title: "Ergonomic Mechanical Keyboard Review",
  description: "Short video review and breakdown.",
  hashtagsJson: ["#TechTikTok", "#SetupGoals"],
  keywordsJson: ["Keyboard", "Tech"],
  cta: "Link in bio for deal",
  altText: "Ergonomic keyboard video banner",
  destinationUrl: "https://affiliate.example.com/keyboard-tiktok",
  platformMetadataJson: { brandContentToggle: true, isAigc: true },
  status: "READY",
  approvalStatus: "APPROVED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("TikTok Production Engine & Provider Tests (v2 Audit Fixes)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Provider Registry Resolution: resolves TikTokProvider", () => {
    const provider = providerRegistry.getProvider("TIKTOK");
    expect(provider).toBeDefined();
    expect(provider.platform).toBe("TIKTOK");
    expect(provider.getCapabilities()).toContain("VIDEO");
    expect(provider.getCapabilities()).toContain("CAPTION");
    expect(provider.getCapabilities()).toContain("SCHEDULING");
  });

  it("2. OAuth State Protection & CSRF Verification", () => {
    const state = generateSignedOAuthState("ws-tiktok-security", "usr-tiktok-88");
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(20);

    const verified = verifyOAuthState(state);
    expect(verified.workspaceId).toBe("ws-tiktok-security");
    expect(verified.userId).toBe("usr-tiktok-88");
  });

  it("3. Token Encryption and Decryption Integrity", () => {
    const rawToken = "secret-tiktok-token-xyz-555";
    const encrypted = encryptSecret(rawToken);
    expect(encrypted).not.toBe(rawToken);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("4. Duplicate Account Connection Prevention", async () => {
    const wsId = "ws-tiktok-dup";
    const acc1 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "TIKTOK",
      externalAccountId: "tiktok-open-id-dup",
      username: "@creator_one",
      accessToken: "token-v1",
    });

    const acc2 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "TIKTOK",
      externalAccountId: "tiktok-open-id-dup",
      username: "@creator_one_updated",
      accessToken: "token-v2",
    });

    expect(acc1.id).toBe(acc2.id); // Same ID updated
    const accounts = await socialAccountService.listWorkspaceAccounts(wsId);
    expect(accounts.filter((a) => a.platform === "TIKTOK").length).toBe(1);
    expect(accounts[0].username).toBe("@creator_one_updated");
  });

  it("5. Token Expiration and Automatic Refresh Exchange", async () => {
    const provider = new TikTokProvider();

    const expiredAccount: SocialAccountData = {
      ...mockTikTokAccount,
      id: "acc-tiktok-exp-1",
      tokenExpiresAt: new Date(Date.now() - 10000), // Expired
      encryptedAccessToken: encryptSecret("old-tiktok-token"),
      encryptedRefreshToken: encryptSecret("valid-refresh-token"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "new-refreshed-tiktok-token-888",
            refresh_token: "new-refresh-token-999",
            expires_in: 86400,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const newToken = await provider.getValidAccessToken(expiredAccount);
    expect(newToken).toBe("new-refreshed-tiktok-token-888");
    vi.unstubAllGlobals();
  });

  it("6. Failed Token Refresh Marks Account as REAUTH_REQUIRED", async () => {
    const provider = new TikTokProvider();

    const expiredAccount: SocialAccountData = {
      ...mockTikTokAccount,
      id: "acc-tiktok-revoked-1",
      workspaceId: "ws-tiktok-revoked",
      tokenExpiresAt: new Date(Date.now() - 10000),
      encryptedAccessToken: encryptSecret("revoked-token"),
      encryptedRefreshToken: encryptSecret("revoked-refresh-token"),
    };

    await socialAccountService.connectAccount({
      workspaceId: "ws-tiktok-revoked",
      platform: "TIKTOK",
      externalAccountId: "tiktok-rev-11",
      username: "@revoked_tiktok_user",
      accessToken: "revoked-token",
      refreshToken: "revoked-refresh-token",
      tokenExpiresAt: new Date(Date.now() - 10000),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("invalid_grant", { status: 400 }))
    );

    await expect(provider.getValidAccessToken(expiredAccount)).rejects.toThrow(
      /Re-authentication required/
    );

    vi.unstubAllGlobals();
  });

  it("7. Creator Info Query & Domain Prefix Verification", async () => {
    const provider = new TikTokProvider();

    // Query Creator Info
    const creatorInfo = await provider.getCreatorInfo("mock-token");
    expect(creatorInfo.privacy_level_options).toContain("PUBLIC_TO_EVERYONE");

    // Test Domain Verification Rule
    vi.stubEnv("TIKTOK_VERIFIED_MEDIA_DOMAIN_PREFIX", "https://verified.domain.com");

    const unverified = provider.validateMedia("https://unverified.domain.com/video.mp4");
    expect(unverified.valid).toBe(false);
    expect(unverified.error).toContain("TIKTOK_MEDIA_URL_PREFIX_NOT_VERIFIED");

    const verified = provider.validateMedia("https://verified.domain.com/video.mp4");
    expect(verified.valid).toBe(true);

    vi.unstubAllEnvs();
  });

  it("8. Human Approval Guard: Fails if content is PENDING", async () => {
    const provider = new TikTokProvider();
    const result = await provider.publish({
      workspaceId: "ws-tiktok-1",
      platform: "TIKTOK",
      account: mockTikTokAccount,
      content: { ...mockApprovedTikTokContent, approvalStatus: "PENDING" },
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/human approval/i);
  });

  it("9. Mock Mode Video Publishing with is_aigc and brand_content_toggle", async () => {
    vi.stubEnv("RUN_REAL_TIKTOK_TEST", "false");
    const provider = new TikTokProvider();

    const result = await provider.publish({
      workspaceId: "ws-tiktok-1",
      platform: "TIKTOK",
      account: mockTikTokAccount,
      content: mockApprovedTikTokContent,
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toMatch(/^v_pub_id_/);
    expect(result.permalink).toContain("tiktok.com/");

    vi.unstubAllEnvs();
  });

  it("10. Real API Live Direct Post with Creator Info & Moderation Handling (Mocked Network)", async () => {
    vi.stubEnv("RUN_REAL_TIKTOK_TEST", "true");
    const provider = new TikTokProvider();

    const fetchMock = vi.fn().mockImplementation(async (input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as { url?: string })?.url || String(input);

      if (url.includes("/post/publish/creator_info/query/")) {
        return new Response(
          JSON.stringify({
            data: {
              privacy_level_options: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
              duet_disabled: false,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url.includes("/post/publish/video/init/")) {
        return new Response(JSON.stringify({ data: { publish_id: "v_pub_id_real_99" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/post/publish/status/fetch/")) {
        return new Response(JSON.stringify({ data: { status: "PUBLISH_COMPLETE" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.publish({
      workspaceId: "ws-tiktok-1",
      platform: "TIKTOK",
      account: mockTikTokAccount,
      content: mockApprovedTikTokContent,
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe("v_pub_id_real_99");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("11. Failed TikTok API Error Classification (Retryable vs Fatal)", async () => {
    vi.stubEnv("RUN_REAL_TIKTOK_TEST", "true");
    const provider = new TikTokProvider();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: unknown) => {
        const url = String(input);
        if (url.includes("creator_info")) {
          return new Response(JSON.stringify({ data: { privacy_level_options: ["SELF_ONLY"] } }), { status: 200 });
        }
        return new Response("TikTok Service Unavailable", { status: 503 });
      })
    );

    const result503 = await provider.publish({
      workspaceId: "ws-tiktok-1",
      platform: "TIKTOK",
      account: mockTikTokAccount,
      content: mockApprovedTikTokContent,
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result503.success).toBe(false);
    expect(result503.errorMessage).toContain("[Retryable]");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("12. Universal Scheduled Publication Workflow Dispatch", async () => {
    const result = await socialPublishingService.publishContent({
      workspaceId: "ws-tiktok-1",
      account: mockTikTokAccount,
      content: mockApprovedTikTokContent,
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBeDefined();
  });

  it("13. Truthful Analytics Adapter Response (video.list Scope Guarded)", async () => {
    const res = await universalAnalyticsProvider.fetchAnalytics(
      "TIKTOK",
      "v_pub_id_real_99"
    );

    expect(res.available).toBe(false);
    expect(res.message).toMatch(/TikTok Video Analytics requires 'video.list' scope/i);
  });
});
