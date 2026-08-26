import { describe, expect, it, vi, beforeEach } from "vitest";
import { LinkedInProvider, getAuthorUrn } from "../../apps/api/src/integrations/social-engine/providers/linkedin-provider.js";
import { providerRegistry } from "../../apps/api/src/integrations/social-engine/providers/provider-registry.js";
import { socialAccountService } from "../../apps/api/src/integrations/social-engine/account-service.js";
import { socialPublishingService } from "../../apps/api/src/integrations/social-engine/publishing-service.js";
import { universalAnalyticsProvider } from "../../apps/api/src/integrations/social-engine/analytics-provider.js";
import { generateSignedOAuthState, verifyOAuthState, encryptSecret, decryptSecret } from "../../apps/api/src/utils/encryption.js";
import type { PlatformContentData, SocialAccountData } from "../../apps/api/src/integrations/social-engine/types.js";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

const mockAccount: SocialAccountData = {
  id: "account-li-test-1",
  workspaceId: "workspace-test-1",
  platform: "LINKEDIN",
  externalAccountId: "urn:li:person:alex-123",
  username: "Alex Rivera",
  displayName: "Alex Rivera",
  accountType: "MEMBER",
  status: "CONNECTED",
  encryptedAccessToken: encryptSecret("mock-access-token-123"),
  encryptedRefreshToken: encryptSecret("mock-refresh-token-456"),
  tokenExpiresAt: new Date(Date.now() + 86400 * 1000),
  metadataJson: null,
  connectedAt: new Date(),
  updatedAt: new Date(),
  createdAt: new Date(),
};

const mockApprovedContent: PlatformContentData = {
  id: "content-li-1",
  workspaceId: "workspace-test-1",
  campaignId: "camp-1",
  assetId: "asset-1",
  platform: "LINKEDIN",
  socialAccountId: "account-li-test-1",
  contentType: "CERTIFICATION",
  caption: "Excited to share my new certification in Advanced AI Systems!",
  title: "AI Master Certification",
  description: "Completed comprehensive certification course",
  hashtagsJson: ["#AI", "#Certification"],
  keywordsJson: ["AI", "Tech"],
  cta: "View Certificate",
  altText: "Certification banner",
  destinationUrl: "https://example.com/certificate/123",
  platformMetadataJson: null,
  status: "READY",
  approvalStatus: "APPROVED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("LinkedIn Production Engine & Provider Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Provider Registry Resolution: resolves LinkedInProvider", () => {
    const provider = providerRegistry.getProvider("LINKEDIN");
    expect(provider).toBeDefined();
    expect(provider.platform).toBe("LINKEDIN");
    expect(provider.getCapabilities()).toContain("TEXT");
    expect(provider.getCapabilities()).toContain("IMAGE_POST");
    expect(provider.getCapabilities()).toContain("DOCUMENT");
  });

  it("2. OAuth State Protection & CSRF Verification", () => {
    const state = generateSignedOAuthState("ws-security-test", "user-456");
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(20);

    const verified = verifyOAuthState(state);
    expect(verified.workspaceId).toBe("ws-security-test");
    expect(verified.userId).toBe("user-456");

    expect(() => verifyOAuthState("invalid.state.signature")).toThrow();
  });

  it("3. Token Encryption and Decryption Integrity", () => {
    const rawToken = "secret-linkedin-token-xyz-789";
    const encrypted = encryptSecret(rawToken);
    expect(encrypted).not.toBe(rawToken);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("4. Duplicate Account Prevention", async () => {
    const wsId = "ws-dup-test";
    const acc1 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "LINKEDIN",
      externalAccountId: "urn:li:person:user-unique-99",
      username: "Jane Doe",
      accessToken: "token-v1",
    });

    const acc2 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "LINKEDIN",
      externalAccountId: "urn:li:person:user-unique-99",
      username: "Jane Doe Updated",
      accessToken: "token-v2",
    });

    expect(acc1.id).toBe(acc2.id); // Same ID updated
    const accounts = await socialAccountService.listWorkspaceAccounts(wsId);
    expect(accounts.filter((a) => a.platform === "LINKEDIN").length).toBe(1);
    expect(accounts[0].username).toBe("Jane Doe Updated");
  });

  it("5. Token Expiration and Token Refresh Flow", async () => {
    const provider = new LinkedInProvider();

    // Expired token
    const expiredAccount: SocialAccountData = {
      ...mockAccount,
      id: "acc-exp-1",
      tokenExpiresAt: new Date(Date.now() - 10000), // Expired
      encryptedAccessToken: encryptSecret("old-expired-token"),
      encryptedRefreshToken: encryptSecret("valid-refresh-token"),
    };

    // Mock successful refresh response
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-refreshed-access-token-999",
          expires_in: 5184000,
          refresh_token: "new-refresh-token-888",
        }),
      })
    );

    const newToken = await provider.getValidAccessToken(expiredAccount);
    expect(newToken).toBe("new-refreshed-access-token-999");
    vi.unstubAllGlobals();
  });

  it("6. Revoked Refresh Token Marks Account as REAUTH_REQUIRED", async () => {
    const provider = new LinkedInProvider();

    const expiredAccount: SocialAccountData = {
      ...mockAccount,
      id: "acc-revoked-1",
      workspaceId: "ws-revoked-1",
      tokenExpiresAt: new Date(Date.now() - 10000),
      encryptedAccessToken: encryptSecret("old-token"),
      encryptedRefreshToken: encryptSecret("revoked-refresh-token"),
    };

    await socialAccountService.connectAccount({
      workspaceId: "ws-revoked-1",
      platform: "LINKEDIN",
      externalAccountId: "urn:li:person:revoked-1",
      username: "Revoked Account",
      accessToken: "old-token",
      refreshToken: "revoked-refresh-token",
      tokenExpiresAt: new Date(Date.now() - 10000),
    });

    // Mock failed refresh response
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "invalid_grant: refresh token revoked",
      })
    );

    await expect(provider.getValidAccessToken(expiredAccount)).rejects.toThrow(
      /Re-authentication required/
    );

    vi.unstubAllGlobals();
  });

  it("7. Human Approval Guard: Fails if content is PENDING", async () => {
    const provider = new LinkedInProvider();
    const result = await provider.publish({
      workspaceId: "workspace-test-1",
      platform: "LINKEDIN",
      account: mockAccount,
      content: { ...mockApprovedContent, approvalStatus: "PENDING" },
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/human approval/i);
  });

  it("8. Organization Permission Guard: Fails if organization permission missing", async () => {
    const provider = new LinkedInProvider();
    const orgAccount: SocialAccountData = {
      ...mockAccount,
      accountType: "ORGANIZATION",
      metadataJson: { hasOrganizationPermission: false },
    };

    const result = await provider.publish({
      workspaceId: "workspace-test-1",
      platform: "LINKEDIN",
      account: orgAccount,
      content: mockApprovedContent,
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/organization management permissions/i);
  });

  it("9. Member URN and Organization URN Formatting", () => {
    const memberUrn = getAuthorUrn(mockAccount);
    expect(memberUrn).toBe("urn:li:person:alex-123");

    const orgAccount: SocialAccountData = {
      ...mockAccount,
      externalAccountId: "987654",
      accountType: "ORGANIZATION",
    };
    const orgUrn = getAuthorUrn(orgAccount);
    expect(orgUrn).toBe("urn:li:organization:987654");
  });

  it("10. Mock Mode Text/Image/Article Publishing Success", async () => {
    vi.stubEnv("RUN_REAL_LINKEDIN_TEST", "false");
    const provider = new LinkedInProvider();

    // Text Post
    const textResult = await provider.publish({
      workspaceId: "workspace-test-1",
      platform: "LINKEDIN",
      account: mockAccount,
      content: mockApprovedContent,
    });
    expect(textResult.success).toBe(true);
    expect(textResult.externalPostId).toMatch(/^linkedin-post-/);

    // Image Post
    const imageResult = await provider.publish({
      workspaceId: "workspace-test-1",
      platform: "LINKEDIN",
      account: mockAccount,
      content: mockApprovedContent,
      mediaUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
    });
    expect(imageResult.success).toBe(true);

    vi.unstubAllEnvs();
  });

  it("11. Real API Live Publishing Flow (Mocked Network)", async () => {
    vi.stubEnv("RUN_REAL_LINKEDIN_TEST", "true");
    const provider = new LinkedInProvider();

    // Mock fetch for image init, image upload, and post creation
    const fetchMock = vi.fn().mockImplementation(async (input: unknown) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as { url?: string })?.url || String(input);
      if (url.includes("/rest/images?action=initializeUpload")) {
        return new Response(
          JSON.stringify({
            value: {
              uploadUrl: "https://upload.linkedin.com/image-binary",
              image: "urn:li:image:11223344",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url.includes("upload.linkedin.com")) {
        return new Response(null, { status: 200 });
      }
      if (url.includes("photo-1500648767791-00dcc994a43e")) {
        return new Response(new Uint8Array(500), {
          status: 200,
          headers: { "content-type": "image/jpeg", "content-length": "500" },
        });
      }
      if (url.includes("/rest/posts")) {
        return new Response(JSON.stringify({ id: "urn:li:share:998877" }), {
          status: 201,
          headers: { "x-restli-id": "urn:li:share:998877" },
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.publish({
      workspaceId: "workspace-test-1",
      platform: "LINKEDIN",
      account: mockAccount,
      content: mockApprovedContent,
      mediaUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe("urn:li:share:998877");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("12. Failed LinkedIn API Response Error Classification", async () => {
    vi.stubEnv("RUN_REAL_LINKEDIN_TEST", "true");
    const provider = new LinkedInProvider();

    // 500 Server error (Retryable)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      })
    );

    const result500 = await provider.publish({
      workspaceId: "workspace-test-1",
      platform: "LINKEDIN",
      account: mockAccount,
      content: mockApprovedContent,
    });

    expect(result500.success).toBe(false);
    expect(result500.errorMessage).toContain("[Retryable]");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("13. Universal Scheduled Publication Workflow Execution", async () => {
    const result = await socialPublishingService.publishContent({
      workspaceId: "workspace-test-1",
      account: mockAccount,
      content: mockApprovedContent,
      mediaUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBeDefined();
  });

  it("14. Analytics Adapter Truthful State (No Fake Metrics)", async () => {
    const res = await universalAnalyticsProvider.fetchAnalytics(
      "LINKEDIN",
      "urn:li:share:998877"
    );
    expect(res.available).toBe(false);
    expect(res.message).toMatch(/LinkedIn analytics requires/i);
    expect(res.metrics).toBeUndefined();
  });
});
