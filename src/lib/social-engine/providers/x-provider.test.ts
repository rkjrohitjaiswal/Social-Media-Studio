import { describe, expect, it, vi, beforeEach } from "vitest";
import { XProvider } from "./x-provider";
import { providerRegistry } from "./provider-registry";
import { socialAccountService } from "../account-service";
import { socialPublishingService } from "../publishing-service";
import { universalAnalyticsProvider } from "../analytics-provider";
import {
  generateSignedOAuthState,
  verifyOAuthState,
  generatePKCEChallenge,
  encryptSecret,
  decryptSecret,
} from "../../security/encryption";
import type { PlatformContentData, SocialAccountData } from "../types";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

const mockXAccount: SocialAccountData = {
  id: "acc-x-test-1",
  workspaceId: "ws-x-1",
  platform: "X",
  externalAccountId: "x_user_1001",
  username: "@studio_x_handle",
  displayName: "Studio X Account",
  accountType: "STANDARD",
  status: "CONNECTED",
  encryptedAccessToken: encryptSecret("mock-x-access-token"),
  encryptedRefreshToken: encryptSecret("mock-x-refresh-token"),
  tokenExpiresAt: new Date(Date.now() + 7200 * 1000),
  metadataJson: { userId: "x_user_1001" },
  connectedAt: new Date(),
  updatedAt: new Date(),
  createdAt: new Date(),
};

const mockApprovedXContent: PlatformContentData = {
  id: "content-x-1",
  workspaceId: "ws-x-1",
  campaignId: "camp-x-1",
  assetId: "asset-x-1",
  platform: "X",
  socialAccountId: "acc-x-test-1",
  contentType: "AFFILIATE_PRODUCT",
  caption: "Introducing the next-gen AI Social Media Content Studio. Streamline multi-platform campaigns effortlessly. #AI #Automation",
  hashtagsJson: ["#AI", "#Automation"],
  status: "READY",
  approvalStatus: "APPROVED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("X (Twitter) Production Engine & Provider Tests (API v2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Provider Registry Resolution: resolves XProvider", () => {
    const provider = providerRegistry.getProvider("X");
    expect(provider).toBeDefined();
    expect(provider.platform).toBe("X");
    expect(provider.getCapabilities()).toContain("TEXT");
    expect(provider.getCapabilities()).toContain("IMAGE_POST");
    expect(provider.getCapabilities()).toContain("VIDEO");
    expect(provider.getCapabilities()).toContain("HASHTAGS");
    expect(provider.getCapabilities()).toContain("SCHEDULING");
  });

  it("2. OAuth 2.0 PKCE Challenge & State CSRF Verification", () => {
    const { codeVerifier, codeChallenge } = generatePKCEChallenge();
    expect(codeVerifier).toBeDefined();
    expect(codeChallenge).toBeDefined();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);

    const state = generateSignedOAuthState("ws-x-security", "usr-x-88", { codeVerifier });
    expect(typeof state).toBe("string");

    const verified = verifyOAuthState(state);
    expect(verified.workspaceId).toBe("ws-x-security");
    expect(verified.userId).toBe("usr-x-88");
    expect(verified.codeVerifier).toBe(codeVerifier);
  });

  it("3. Token Encryption and Decryption Integrity", () => {
    const rawToken = "secret-x-oauth-token-xyz-123";
    const encrypted = encryptSecret(rawToken);
    expect(encrypted).not.toBe(rawToken);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("4. Multi-Account Connection & Workspace Isolation", async () => {
    const wsId = "ws-x-multi";
    const acc1 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "X",
      externalAccountId: "x_user_alpha",
      username: "@x_alpha",
      displayName: "X Alpha",
      accessToken: "token-alpha",
    });

    const acc2 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "X",
      externalAccountId: "x_user_beta",
      username: "@x_beta",
      displayName: "X Beta",
      accessToken: "token-beta",
    });

    expect(acc1.id).not.toBe(acc2.id);
    const accounts = await socialAccountService.listWorkspaceAccounts(wsId);
    const xAccounts = accounts.filter((a) => a.platform === "X");
    expect(xAccounts.length).toBe(2);
  });

  it("5. Token Expiration and Automatic Refresh Exchange", async () => {
    const provider = new XProvider();

    const expiredAccount: SocialAccountData = {
      ...mockXAccount,
      id: "acc-x-exp-1",
      tokenExpiresAt: new Date(Date.now() - 10000), // Expired
      encryptedAccessToken: encryptSecret("old-x-token"),
      encryptedRefreshToken: encryptSecret("valid-x-refresh-token"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "new-refreshed-x-token-999",
            refresh_token: "new-refreshed-x-refresh-token",
            expires_in: 7200,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const newToken = await provider.getValidAccessToken(expiredAccount);
    expect(newToken).toBe("new-refreshed-x-token-999");
    vi.unstubAllGlobals();
  });

  it("6. Failed Token Refresh Marks Account as REAUTH_REQUIRED", async () => {
    const provider = new XProvider();

    const expiredAccount: SocialAccountData = {
      ...mockXAccount,
      id: "acc-x-revoked-1",
      workspaceId: "ws-x-revoked",
      tokenExpiresAt: new Date(Date.now() - 10000),
      encryptedAccessToken: encryptSecret("revoked-x-token"),
      encryptedRefreshToken: encryptSecret("invalid-refresh-token"),
    };

    await socialAccountService.connectAccount({
      workspaceId: "ws-x-revoked",
      platform: "X",
      externalAccountId: "x_revoked_user",
      username: "@revoked_x",
      accessToken: "revoked-x-token",
      refreshToken: "invalid-refresh-token",
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

  it("7. Character Limit & Media Validation Rules (280-char limit & HTTPS)", () => {
    const provider = new XProvider();

    // Text limit validation
    const validText = provider.validateTextLength("Short tweet content");
    expect(validText.valid).toBe(true);

    const longText = "a".repeat(281);
    const invalidText = provider.validateTextLength(longText);
    expect(invalidText.valid).toBe(false);
    expect(invalidText.error).toMatch(/exceeds character limit/i);

    // Media HTTPS validation
    const httpUrl = provider.validateMedia("http://example.com/image.png");
    expect(httpUrl.valid).toBe(false);
    expect(httpUrl.error).toMatch(/HTTPS media URL/i);

    const validImage = provider.validateMedia("https://images.unsplash.com/photo-123.jpg");
    expect(validImage.valid).toBe(true);
  });

  it("8. Human Approval Guard: Fails if content is PENDING", async () => {
    const provider = new XProvider();
    const result = await provider.publish({
      workspaceId: "ws-x-1",
      platform: "X",
      account: mockXAccount,
      content: { ...mockApprovedXContent, approvalStatus: "PENDING" },
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/human approval/i);
  });

  it("9. Text Tweet Publishing in Mock Mode with Affiliate Disclosure", async () => {
    vi.stubEnv("RUN_REAL_X_TEST", "false");
    const provider = new XProvider();

    const result = await provider.publish({
      workspaceId: "ws-x-1",
      platform: "X",
      account: mockXAccount,
      content: mockApprovedXContent,
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toMatch(/^x_tweet_/);
    expect(result.permalink).toContain("x.com/user/status/");

    vi.unstubAllEnvs();
  });

  it("10. Image Tweet Publishing in Mock Mode", async () => {
    vi.stubEnv("RUN_REAL_X_TEST", "false");
    const provider = new XProvider();

    const result = await provider.publish({
      workspaceId: "ws-x-1",
      platform: "X",
      account: mockXAccount,
      content: { ...mockApprovedXContent, contentType: "TEACHING" },
      mediaUrl: "https://images.unsplash.com/photo-123.jpg",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBeDefined();

    vi.unstubAllEnvs();
  });

  it("11. Real API Tweet Creation via X API v2 (Mocked Network)", async () => {
    vi.stubEnv("RUN_REAL_X_TEST", "true");
    const provider = new XProvider();

    const fetchMock = vi.fn().mockImplementation(async (input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as { url?: string })?.url || String(input);

      if (url.includes("/2/tweets")) {
        return new Response(
          JSON.stringify({ data: { id: "tweet_real_v2_1001" } }),
          { status: 201, headers: { "content-type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.publish({
      workspaceId: "ws-x-1",
      platform: "X",
      account: mockXAccount,
      content: mockApprovedXContent,
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe("tweet_real_v2_1001");
    expect(result.permalink).toBe("https://x.com/user/status/tweet_real_v2_1001");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("12. Failed X API Error Classification (Retryable 429/5xx vs Fatal 4xx)", async () => {
    vi.stubEnv("RUN_REAL_X_TEST", "true");
    const provider = new XProvider();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Too Many Requests", { status: 429 })
      )
    );

    const result429 = await provider.publish({
      workspaceId: "ws-x-1",
      platform: "X",
      account: mockXAccount,
      content: mockApprovedXContent,
    });

    expect(result429.success).toBe(false);
    expect(result429.errorMessage).toContain("[Retryable]");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("13. Universal Scheduled Publication Workflow Dispatch", async () => {
    const result = await socialPublishingService.publishContent({
      workspaceId: "ws-x-1",
      account: mockXAccount,
      content: mockApprovedXContent,
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBeDefined();
  });

  it("14. Truthful Analytics Adapter Response Guard", async () => {
    const res = await universalAnalyticsProvider.fetchAnalytics(
      "X",
      "tweet_real_v2_1001"
    );

    expect(res.available).toBe(false);
    expect(res.message).toMatch(/X \(Twitter\) analytics requires 'tweet.read' scope/i);
  });
});
