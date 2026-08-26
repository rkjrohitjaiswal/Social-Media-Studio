import { describe, expect, it, vi, beforeEach } from "vitest";
import { YouTubeProvider } from "../../apps/api/src/integrations/social-engine/providers/youtube-provider.js";
import { providerRegistry } from "../../apps/api/src/integrations/social-engine/providers/provider-registry.js";
import { socialAccountService } from "../../apps/api/src/integrations/social-engine/account-service.js";
import { socialPublishingService } from "../../apps/api/src/integrations/social-engine/publishing-service.js";
import { universalAnalyticsProvider } from "../../apps/api/src/integrations/social-engine/analytics-provider.js";
import { generateSignedOAuthState, verifyOAuthState, encryptSecret, decryptSecret } from "../../apps/api/src/utils/encryption.js";
import type { PlatformContentData, SocialAccountData } from "../../apps/api/src/integrations/social-engine/types.js";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

const mockYouTubeAccount: SocialAccountData = {
  id: "acc-yt-test-1",
  workspaceId: "ws-yt-1",
  platform: "YOUTUBE",
  externalAccountId: "UC_youtube_channel_8899",
  username: "@studio_youtube_creator",
  displayName: "Studio YouTube Channel",
  accountType: "CHANNEL",
  status: "CONNECTED",
  encryptedAccessToken: encryptSecret("mock-yt-access-token"),
  encryptedRefreshToken: encryptSecret("mock-yt-refresh-token"),
  tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
  metadataJson: { channelId: "UC_youtube_channel_8899" },
  connectedAt: new Date(),
  updatedAt: new Date(),
  createdAt: new Date(),
};

const mockApprovedYouTubeContent: PlatformContentData = {
  id: "content-yt-1",
  workspaceId: "ws-yt-1",
  campaignId: "camp-yt-1",
  assetId: "asset-yt-1",
  platform: "YOUTUBE",
  socialAccountId: "acc-yt-test-1",
  contentType: "AFFILIATE_PRODUCT",
  caption: "Masterclass: 1:N AI Social Content Studio Architecture & Full Workflow Setup. #Tech #AIStudio #Architecture",
  title: "1:N AI Social Content Studio Masterclass",
  description: "Complete guide and technical walkthrough for multi-platform content automation. Disclosure: This video contains affiliate links. #ad #affiliate",
  hashtagsJson: ["#Tech", "#AIStudio", "#Architecture"],
  keywordsJson: ["YouTube", "Studio"],
  cta: "Subscribe for more tutorials",
  altText: "YouTube Masterclass Thumbnail",
  destinationUrl: "https://studio.example.com/masterclass",
  platformMetadataJson: { privacyStatus: "public" },
  status: "READY",
  approvalStatus: "APPROVED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("YouTube Production Engine & Provider Tests (v3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Provider Registry Resolution: resolves YouTubeProvider", () => {
    const provider = providerRegistry.getProvider("YOUTUBE");
    expect(provider).toBeDefined();
    expect(provider.platform).toBe("YOUTUBE");
    expect(provider.getCapabilities()).toContain("VIDEO");
    expect(provider.getCapabilities()).toContain("TITLE");
    expect(provider.getCapabilities()).toContain("DESCRIPTION");
    expect(provider.getCapabilities()).toContain("SCHEDULING");
  });

  it("2. OAuth State Protection & CSRF Verification", () => {
    const state = generateSignedOAuthState("ws-yt-security", "usr-yt-88");
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(20);

    const verified = verifyOAuthState(state);
    expect(verified.workspaceId).toBe("ws-yt-security");
    expect(verified.userId).toBe("usr-yt-88");
  });

  it("3. Token Encryption and Decryption Integrity", () => {
    const rawToken = "secret-yt-google-token-xyz-999";
    const encrypted = encryptSecret(rawToken);
    expect(encrypted).not.toBe(rawToken);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("4. Multi-YouTube Channel Connection & Account Isolation", async () => {
    const wsId = "ws-yt-multi";
    const acc1 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "YOUTUBE",
      externalAccountId: "UC_channel_alpha",
      username: "@channel_alpha",
      displayName: "Channel Alpha",
      accessToken: "token-alpha",
    });

    const acc2 = await socialAccountService.connectAccount({
      workspaceId: wsId,
      platform: "YOUTUBE",
      externalAccountId: "UC_channel_beta",
      username: "@channel_beta",
      displayName: "Channel Beta",
      accessToken: "token-beta",
    });

    expect(acc1.id).not.toBe(acc2.id);
    const accounts = await socialAccountService.listWorkspaceAccounts(wsId);
    const ytAccounts = accounts.filter((a) => a.platform === "YOUTUBE");
    expect(ytAccounts.length).toBe(2);
  });

  it("5. Token Expiration and Automatic Refresh Exchange", async () => {
    const provider = new YouTubeProvider();

    const expiredAccount: SocialAccountData = {
      ...mockYouTubeAccount,
      id: "acc-yt-exp-1",
      tokenExpiresAt: new Date(Date.now() - 10000), // Expired
      encryptedAccessToken: encryptSecret("old-yt-token"),
      encryptedRefreshToken: encryptSecret("valid-yt-refresh-token"),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "new-refreshed-yt-token-777",
            expires_in: 3600,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const newToken = await provider.getValidAccessToken(expiredAccount);
    expect(newToken).toBe("new-refreshed-yt-token-777");
    vi.unstubAllGlobals();
  });

  it("6. Failed Token Refresh Marks Account as REAUTH_REQUIRED", async () => {
    const provider = new YouTubeProvider();

    const expiredAccount: SocialAccountData = {
      ...mockYouTubeAccount,
      id: "acc-yt-revoked-1",
      workspaceId: "ws-yt-revoked",
      tokenExpiresAt: new Date(Date.now() - 10000),
      encryptedAccessToken: encryptSecret("revoked-yt-token"),
      encryptedRefreshToken: encryptSecret("invalid-refresh-token"),
    };

    await socialAccountService.connectAccount({
      workspaceId: "ws-yt-revoked",
      platform: "YOUTUBE",
      externalAccountId: "UC_revoked_yt",
      username: "@revoked_yt_channel",
      accessToken: "revoked-yt-token",
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

  it("7. Video Validation Rules (HTTPS & Supported Video Formats)", () => {
    const provider = new YouTubeProvider();

    const missing = provider.validateMedia();
    expect(missing.valid).toBe(false);
    expect(missing.error).toMatch(/requires a valid video/i);

    const httpUrl = provider.validateMedia("http://example.com/video.mp4");
    expect(httpUrl.valid).toBe(false);
    expect(httpUrl.error).toMatch(/HTTPS media URL/i);

    const validMp4 = provider.validateMedia("https://images.example.com/video.mp4");
    expect(validMp4.valid).toBe(true);

    const validMkv = provider.validateMedia("https://images.example.com/demo.mkv");
    expect(validMkv.valid).toBe(true);
  });

  it("8. Human Approval Guard: Fails if content is PENDING", async () => {
    const provider = new YouTubeProvider();
    const result = await provider.publish({
      workspaceId: "ws-yt-1",
      platform: "YOUTUBE",
      account: mockYouTubeAccount,
      content: { ...mockApprovedYouTubeContent, approvalStatus: "PENDING" },
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/human approval/i);
  });

  it("9. Mock Mode Video Publishing", async () => {
    vi.stubEnv("RUN_REAL_YOUTUBE_TEST", "false");
    const provider = new YouTubeProvider();

    const result = await provider.publish({
      workspaceId: "ws-yt-1",
      platform: "YOUTUBE",
      account: mockYouTubeAccount,
      content: mockApprovedYouTubeContent,
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toMatch(/^yt_video_/);
    expect(result.permalink).toContain("youtube.com/watch?v=");

    vi.unstubAllEnvs();
  });

  it("10. Real API Video Upload via YouTube Data API v3 (Mocked Network)", async () => {
    vi.stubEnv("RUN_REAL_YOUTUBE_TEST", "true");
    const provider = new YouTubeProvider();

    const fetchMock = vi.fn().mockImplementation(async (input: unknown) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as { url?: string })?.url || String(input);

      if (url.includes("/upload/youtube/v3/videos")) {
        return new Response(JSON.stringify({ id: "yt_video_real_100" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await provider.publish({
      workspaceId: "ws-yt-1",
      platform: "YOUTUBE",
      account: mockYouTubeAccount,
      content: mockApprovedYouTubeContent,
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe("yt_video_real_100");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("11. Failed YouTube API Error Classification (Retryable vs Fatal)", async () => {
    vi.stubEnv("RUN_REAL_YOUTUBE_TEST", "true");
    const provider = new YouTubeProvider();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("YouTube Service Quota Exceeded", { status: 503 })
      )
    );

    const result503 = await provider.publish({
      workspaceId: "ws-yt-1",
      platform: "YOUTUBE",
      account: mockYouTubeAccount,
      content: mockApprovedYouTubeContent,
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result503.success).toBe(false);
    expect(result503.errorMessage).toContain("[Retryable]");

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("12. Universal Scheduled Publication Workflow Dispatch", async () => {
    const result = await socialPublishingService.publishContent({
      workspaceId: "ws-yt-1",
      account: mockYouTubeAccount,
      content: mockApprovedYouTubeContent,
      mediaUrl: "https://images.example.com/video.mp4",
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBeDefined();
  });

  it("13. Truthful Analytics Adapter Response (youtube.readonly Scope Guarded)", async () => {
    const res = await universalAnalyticsProvider.fetchAnalytics(
      "YOUTUBE",
      "yt_video_real_100"
    );

    expect(res.available).toBe(false);
    expect(res.message).toMatch(/YouTube Video Analytics requires 'youtube.readonly' scope/i);
  });
});
