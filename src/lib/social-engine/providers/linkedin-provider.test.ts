import { describe, expect, it, vi } from "vitest";
import { LinkedInProvider } from "./linkedin-provider";
import type { PlatformContentData, SocialAccountData } from "../types";

const account: SocialAccountData = {
  id: "account-1",
  workspaceId: "workspace-1",
  platform: "LINKEDIN",
  externalAccountId: "123456",
  username: "example",
  displayName: "Example",
  accountType: "MEMBER",
  status: "CONNECTED",
  encryptedAccessToken: null,
  encryptedRefreshToken: null,
  tokenExpiresAt: null,
  metadataJson: null,
  connectedAt: new Date(),
  updatedAt: new Date(),
  createdAt: new Date(),
};

const content: PlatformContentData = {
  id: "content-1",
  workspaceId: "workspace-1",
  campaignId: null,
  assetId: null,
  platform: "LINKEDIN",
  socialAccountId: "account-1",
  contentType: "GENERAL",
  caption: "A useful professional update.",
  title: null,
  description: null,
  hashtagsJson: null,
  keywordsJson: null,
  cta: null,
  altText: null,
  destinationUrl: null,
  platformMetadataJson: null,
  status: "READY",
  approvalStatus: "APPROVED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("LinkedInProvider", () => {
  it("exposes LinkedIn capabilities", () => {
    const provider = new LinkedInProvider();
    expect(provider.platform).toBe("LINKEDIN");
    expect(provider.getCapabilities()).toContain("TEXT");
    expect(provider.getCapabilities()).toContain("IMAGE_POST");
    expect(provider.getCapabilities()).toContain("DOCUMENT");
  });

  it("requires human approval before publishing", async () => {
    const provider = new LinkedInProvider();
    const result = await provider.publish({
      workspaceId: "workspace-1",
      platform: "LINKEDIN",
      account,
      content: { ...content, approvalStatus: "PENDING" },
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/human approval/i);
  });

  it("uses the safe mock path unless real API testing is explicitly enabled", async () => {
    vi.stubEnv("RUN_REAL_LINKEDIN_TEST", "false");
    const provider = new LinkedInProvider();
    const result = await provider.publish({
      workspaceId: "workspace-1",
      platform: "LINKEDIN",
      account,
      content,
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toMatch(/^linkedin-post-/);
    vi.unstubAllEnvs();
  });
});
