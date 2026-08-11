import { describe, expect, it, vi, beforeEach } from "vitest";
import { FacebookProvider } from "./facebook-provider";
import { providerRegistry } from "./provider-registry";
import { socialAccountService } from "../account-service";
import { socialPublishingService } from "../publishing-service";
import { universalAnalyticsProvider } from "../analytics-provider";
import { generateSignedOAuthState, verifyOAuthState, encryptSecret, decryptSecret } from "../../security/encryption";
import type { PlatformContentData, SocialAccountData } from "../types";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

const mockFacebookAccount: SocialAccountData = {
  id: "acc-fb-test-1",
  workspaceId: "ws-fb-1",
  platform: "FACEBOOK",
  externalAccountId: "fb-page-9988",
  username: "@innovators_fb_page",
  displayName: "Innovators Facebook Page",
  accountType: "PAGE",
  status: "CONNECTED",
  encryptedAccessToken: encryptSecret("mock-fb-page-access-token"),
  encryptedRefreshToken: encryptSecret("mock-fb-user-long-lived-token"),
  tokenExpiresAt: new Date(Date.now() + 60 * 86400 * 1000),
  metadataJson: { pageId: "fb-page-9988", pageName: "Innovators Facebook Page" },
  connectedAt: new Date(),
  updatedAt: new Date(),
  createdAt: new Date(),
};

const mockApprovedFbContent: PlatformContentData = {
  id: "content-fb-1",
  workspaceId: "ws-fb-1",
  campaignId: "camp-fb-1",
  assetId: "asset-fb-1",
  platform: "FACEBOOK",
  socialAccountId: "acc-fb-test-1",
  contentType: "ANNOUNCEMENT",
  caption: "We are thrilled to announce our next-gen AI Social Media Suite! Check out the launch guide. #ad #announcement",
  title: "Next-Gen AI Launch",
  description: "Official launch post for Facebook Page audience.",
  hashtagsJson: ["#AI", "#Innovation"],
  keywordsJson: ["AI", "Tech"],
  cta: "Learn more on our website",
  altText: "AI launch banner",
  destinationUrl: "https://example.com/launch",
  platformMetadataJson: null,
  status: "READY",
  approvalStatus: "APPROVED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Facebook Production Engine & Provider Tests (v25.0)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Provider Registry Resolution: resolves FacebookProvider", () => {
    const provider = providerRegistry.getProvider("FACEBOOK");
    expect(provider).toBeDefined();
    expect(provider.platform).toBe("FACEBOOK");
    expect(provider.getCapabilities()).toContain("TEXT");
    expect(provider.getCapabilities()).toContain("IMAGE_POST");
    expect(provider.getCapabilities()).toContain("SCHEDULING");
  });

  it("2. OAuth State Protection & CSRF Verification", () => {
    const state = generateSignedOAuthState("ws-fb-security", "usr-fb-55");
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(20);

    const verified = verifyOAuthState(state);
    expect(verified.workspaceId).toBe("ws-fb-security");
    expect(verified.userId).toBe("usr-fb-55");
  });

  it("3. Token Encryption and Decryption Integrity", () => {
    const rawToken = "secret-fb-page-token-abc-999";
    const encrypted = encryptSecret(rawToken);
    expect(encrypted).not.toBe(rawToken);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("4. Duplicate Account Connection Prevention", async () => {
    const wsId = "ws-fb-dup";
    const acc1 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "FACEBOOK",
      externalAccountId: "fb-page-dup-1",
      username: "@brand_page",
      accessToken: "token-v1",
    });

    const acc2 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "FACEBOOK",
      externalAccountId: "fb-page-dup-1",
      username: "@brand_page_updated",
      accessToken: "token-v2",
    });

    expect(acc1.id).toBe(acc2.id); // Same ID updated
    const accounts = await socialAccountService.listWorkspaceAccounts(wsId);
    expect(accounts.filter((a) => a.platform === "FACEBOOK").length).toBe(1);
    expect(accounts[0].username).toBe("@brand_page_updated");
  });

  it("5. Token Expiration and Automatic Refresh Exchange", async () => {
    const provider = new FacebookProvider();

    const expiredAccount: SocialAccountData = {
      ...mockFacebookAccount,
      id: "acc-fb-exp-1",
      tokenExpiresAt: new Date(Date.now() - 10000), // Expired
      encryptedAccessToken: encryptSecret("old-fb-token"),
      encryptedRefreshToken: encryptSecret("valid-user-token"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "new-refreshed-fb-page-token-999",
            expires_in: 5184000,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const newToken = await provider.getValidAccessToken(expiredAccount);
    expect(newToken).toBe("new-refreshed-fb-page-token-999");
    vi.unstubAllGlobals();
  });

  it("6. Revoked Token Connection Verification Marks Account as REAUTH_REQUIRED", async () => {
    vi.stubEnv("RUN_REAL_FACEBOOK_TEST", "true");
    const provider = new FacebookProvider();

    const createdAccount = await socialAccountService.connectAccount({
      workspaceId: "ws-fb-revoked-99",
      platform: "FACEBOOK",
      externalAccountId: "fb-page-rev-99",
      username: "@revoked_page",
      accessToken: "revoked-token",
    });

    const revokedAccount: SocialAccountData = {
      ...mockFacebookAccount,
      id: createdAccount.id,
      workspaceId: "ws-fb-revoked-99",
      externalAccountId: "fb-page-rev-99",
      status: "CONNECTED",
      encryptedAccessToken: encryptSecret("revoked-token"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Invalid OAuth access token", code: 190 } }),
          { status: 401, headers: { "content-type": "application/json" } }
        )
      )
    );

    const isValid = await provider.verifyConnection(revokedAccount);
    expect(isValid).toBe(false);

    const recheck = await socialAccountService.getAccountById(createdAccount.id, "ws-fb-revoked-99");
    expect(recheck?.status).toBe("REAUTH_REQUIRED");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("7. Page Discovery & Listing", async () => {
    const provider = new FacebookProvider();
    const pages = await provider.getPages(mockFacebookAccount);

    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0].id).toBeDefined();
    expect(pages[0].name).toBeDefined();
  });

  it("8. Human Approval Guard: Fails if content is PENDING", async () => {
    const provider = new FacebookProvider();
    const result = await provider.publish({
      workspaceId: "ws-fb-1",
      platform: "FACEBOOK",
      account: mockFacebookAccount,
      content: { ...mockApprovedFbContent, approvalStatus: "PENDING" },
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/human approval/i);
  });

  it("9. Mock Mode Text, Image, and Link Post Publishing", async () => {
    vi.stubEnv("RUN_REAL_FACEBOOK_TEST", "false");
    const provider = new FacebookProvider();

    const result = await provider.publish({
      workspaceId: "ws-fb-1",
      platform: "FACEBOOK",
      account: mockFacebookAccount,
      content: mockApprovedFbContent,
      mediaUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toMatch(/^fb-post-/);
    expect(result.permalink).toContain("facebook.com/");

    vi.unstubAllEnvs();
  });

  it("10. Real API Live Post Publishing with Graph API v25.0 (Mocked Network)", async () => {
    vi.stubEnv("RUN_REAL_FACEBOOK_TEST", "true");
    const provider = new FacebookProvider();

    const fetchMock = vi.fn().mockImplementation(async (input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as { url?: string })?.url || String(input);

      expect(url).toContain("/v25.0/");

      if (url.includes("/photos") || url.includes("/feed")) {
        return new Response(JSON.stringify({ id: "fb-post-created-v25", post_id: "fb-post-created-v25" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.publish({
      workspaceId: "ws-fb-1",
      platform: "FACEBOOK",
      account: mockFacebookAccount,
      content: mockApprovedFbContent,
      mediaUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe("fb-post-created-v25");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("11. Failed Facebook API Error Classification (Retryable vs Fatal)", async () => {
    vi.stubEnv("RUN_REAL_FACEBOOK_TEST", "true");
    const provider = new FacebookProvider();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Facebook Internal Error", { status: 500 })
      )
    );

    const result500 = await provider.publish({
      workspaceId: "ws-fb-1",
      platform: "FACEBOOK",
      account: mockFacebookAccount,
      content: mockApprovedFbContent,
    });

    expect(result500.success).toBe(false);
    expect(result500.errorMessage).toContain("[Retryable]");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("12. Universal Scheduled Publication Workflow Dispatch", async () => {
    const result = await socialPublishingService.publishContent({
      workspaceId: "ws-fb-1",
      account: mockFacebookAccount,
      content: mockApprovedFbContent,
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBeDefined();
  });

  it("13. Truthful Analytics Adapter Response (Permission Guarded)", async () => {
    const res = await universalAnalyticsProvider.fetchAnalytics(
      "FACEBOOK",
      "fb-post-created-v25"
    );

    expect(res.available).toBe(false);
    expect(res.message).toMatch(/Facebook Page insights require 'pages_read_engagement'/i);
  });
});
