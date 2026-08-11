import { describe, expect, it, vi, beforeEach } from "vitest";
import { PinterestProvider } from "./pinterest-provider";
import { providerRegistry } from "./provider-registry";
import { socialAccountService } from "../account-service";
import { socialPublishingService } from "../publishing-service";
import { universalAnalyticsProvider } from "../analytics-provider";
import { generateSignedOAuthState, verifyOAuthState, encryptSecret, decryptSecret } from "../../security/encryption";
import type { PlatformContentData, SocialAccountData } from "../types";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

const mockPinterestAccount: SocialAccountData = {
  id: "acc-pin-test-1",
  workspaceId: "ws-pin-1",
  platform: "PINTEREST",
  externalAccountId: "pin-usr-9911",
  username: "@tech_inspiration",
  displayName: "Tech Inspiration Board",
  accountType: "BUSINESS",
  status: "CONNECTED",
  encryptedAccessToken: encryptSecret("mock-pin-access-token"),
  encryptedRefreshToken: encryptSecret("mock-pin-refresh-token"),
  tokenExpiresAt: new Date(Date.now() + 86400 * 1000),
  metadataJson: { defaultBoardId: "board-101" },
  connectedAt: new Date(),
  updatedAt: new Date(),
  createdAt: new Date(),
};

const mockApprovedPinContent: PlatformContentData = {
  id: "content-pin-1",
  workspaceId: "ws-pin-1",
  campaignId: "camp-pin-1",
  assetId: "asset-pin-1",
  platform: "PINTEREST",
  socialAccountId: "acc-pin-test-1",
  contentType: "AFFILIATE_PRODUCT",
  caption: "Elevate your workspace with this ergonomic keyboard. Features precision keys. Disclosure: Contains affiliate links. #ad #affiliate",
  title: "Ergonomic Mechanical Keyboard",
  description: "Detailed product review and specs guide.",
  hashtagsJson: ["#TechFinds", "#WorkspaceGoals"],
  keywordsJson: ["Keyboard", "Productivity"],
  cta: "Click link to visit product page",
  altText: "Ergonomic keyboard product image",
  destinationUrl: "https://affiliate.example.com/keyboard-deal",
  platformMetadataJson: { boardId: "board-101" },
  status: "READY",
  approvalStatus: "APPROVED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Pinterest Production Engine & Provider Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Provider Registry Resolution: resolves PinterestProvider", () => {
    const provider = providerRegistry.getProvider("PINTEREST");
    expect(provider).toBeDefined();
    expect(provider.platform).toBe("PINTEREST");
    expect(provider.getCapabilities()).toContain("PIN");
    expect(provider.getCapabilities()).toContain("TITLE");
    expect(provider.getCapabilities()).toContain("BOARD");
    expect(provider.getCapabilities()).toContain("DESTINATION_URL");
  });

  it("2. OAuth State Protection & CSRF Verification", () => {
    const state = generateSignedOAuthState("ws-pin-security", "usr-pin-44");
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(20);

    const verified = verifyOAuthState(state);
    expect(verified.workspaceId).toBe("ws-pin-security");
    expect(verified.userId).toBe("usr-pin-44");
  });

  it("3. Token Encryption and Decryption Integrity", () => {
    const rawToken = "secret-pin-token-xyz-123";
    const encrypted = encryptSecret(rawToken);
    expect(encrypted).not.toBe(rawToken);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("4. Duplicate Account Connection Prevention", async () => {
    const wsId = "ws-pin-dup";
    const acc1 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "PINTEREST",
      externalAccountId: "pin-usr-dup-1",
      username: "@style_hub",
      accessToken: "token-v1",
    });

    const acc2 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "PINTEREST",
      externalAccountId: "pin-usr-dup-1",
      username: "@style_hub_updated",
      accessToken: "token-v2",
    });

    expect(acc1.id).toBe(acc2.id); // Same ID updated
    const accounts = await socialAccountService.listWorkspaceAccounts(wsId);
    expect(accounts.filter((a) => a.platform === "PINTEREST").length).toBe(1);
    expect(accounts[0].username).toBe("@style_hub_updated");
  });

  it("5. Token Expiration and Automatic Refresh Exchange", async () => {
    const provider = new PinterestProvider();

    const expiredAccount: SocialAccountData = {
      ...mockPinterestAccount,
      id: "acc-pin-exp-1",
      tokenExpiresAt: new Date(Date.now() - 10000), // Expired
      encryptedAccessToken: encryptSecret("old-pin-token"),
      encryptedRefreshToken: encryptSecret("valid-refresh-token"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "new-refreshed-pin-token-777",
            refresh_token: "new-refresh-token-888",
            expires_in: 2592000,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const newToken = await provider.getValidAccessToken(expiredAccount);
    expect(newToken).toBe("new-refreshed-pin-token-777");
    vi.unstubAllGlobals();
  });

  it("6. Failed Token Refresh Marks Account as REAUTH_REQUIRED", async () => {
    const provider = new PinterestProvider();

    const expiredAccount: SocialAccountData = {
      ...mockPinterestAccount,
      id: "acc-pin-revoked-1",
      workspaceId: "ws-pin-revoked",
      tokenExpiresAt: new Date(Date.now() - 10000),
      encryptedAccessToken: encryptSecret("revoked-token"),
      encryptedRefreshToken: encryptSecret("revoked-refresh-token"),
    };

    await socialAccountService.connectAccount({
      workspaceId: "ws-pin-revoked",
      platform: "PINTEREST",
      externalAccountId: "pin-revoked-99",
      username: "@revoked_pin_user",
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

  it("7. Board Retrieval & Selection", async () => {
    const provider = new PinterestProvider();
    const boards = await provider.getBoards(mockPinterestAccount);

    expect(boards.length).toBeGreaterThan(0);
    expect(boards[0].id).toBeDefined();
    expect(boards[0].name).toBeDefined();
  });

  it("8. Human Approval Guard: Fails if content is PENDING", async () => {
    const provider = new PinterestProvider();
    const result = await provider.publish({
      workspaceId: "ws-pin-1",
      platform: "PINTEREST",
      account: mockPinterestAccount,
      content: { ...mockApprovedPinContent, approvalStatus: "PENDING" },
      mediaUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/human approval/i);
  });

  it("9. Mock Mode Image Pin Creation with Destination URL", async () => {
    vi.stubEnv("RUN_REAL_PINTEREST_TEST", "false");
    const provider = new PinterestProvider();

    const result = await provider.publish({
      workspaceId: "ws-pin-1",
      platform: "PINTEREST",
      account: mockPinterestAccount,
      content: mockApprovedPinContent,
      mediaUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toMatch(/^pin-post-/);
    expect(result.permalink).toContain("pinterest.com/pin/");

    vi.unstubAllEnvs();
  });

  it("10. Real API Live Pin Creation (Mocked Network)", async () => {
    vi.stubEnv("RUN_REAL_PINTEREST_TEST", "true");
    const provider = new PinterestProvider();

    const fetchMock = vi.fn().mockImplementation(async (input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as { url?: string })?.url || String(input);

      if (url.includes("/v5/pins")) {
        return new Response(JSON.stringify({ id: "pin-created-887766" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/v5/boards")) {
        return new Response(
          JSON.stringify({
            items: [{ id: "board-101", name: "Affiliate Finds" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.publish({
      workspaceId: "ws-pin-1",
      platform: "PINTEREST",
      account: mockPinterestAccount,
      content: mockApprovedPinContent,
      mediaUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe("pin-created-887766");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("11. Failed Pinterest API Error Classification (Retryable vs Fatal)", async () => {
    vi.stubEnv("RUN_REAL_PINTEREST_TEST", "true");
    const provider = new PinterestProvider();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Pinterest Internal Error", { status: 502 })
      )
    );

    const result502 = await provider.publish({
      workspaceId: "ws-pin-1",
      platform: "PINTEREST",
      account: mockPinterestAccount,
      content: mockApprovedPinContent,
      mediaUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
    });

    expect(result502.success).toBe(false);
    expect(result502.errorMessage).toContain("[Retryable]");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("12. Universal Scheduled Publication Workflow Dispatch", async () => {
    const result = await socialPublishingService.publishContent({
      workspaceId: "ws-pin-1",
      account: mockPinterestAccount,
      content: mockApprovedPinContent,
      mediaUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBeDefined();
  });

  it("13. Truthful Analytics Adapter Response (Permission Guarded)", async () => {
    const res = await universalAnalyticsProvider.fetchAnalytics(
      "PINTEREST",
      "pin-created-887766"
    );

    expect(res.available).toBe(false);
    expect(res.message).toMatch(/Pinterest analytics requires 'pins:read' scope/i);
  });
});
