import { describe, expect, it } from "vitest";
import { XProvider } from "./x-provider";

const provider = new XProvider();
const account = {
  id: "x-1", workspaceId: "ws-1", platform: "X" as const, externalAccountId: "123", username: "@demo", displayName: "Demo",
  status: "CONNECTED" as const, encryptedAccessToken: "mock-token", connectedAt: new Date(), updatedAt: new Date(), createdAt: new Date(),
};

const content = (caption: string, contentType: "GENERAL" | "AFFILIATE_PRODUCT" = "GENERAL") => ({
  id: "content-1", workspaceId: "ws-1", platform: "X" as const, contentType, caption, title: null, description: null,
  hashtagsJson: [], keywordsJson: [], cta: null, altText: null, destinationUrl: null, platformMetadataJson: null,
  status: "READY", approvalStatus: "APPROVED" as const, createdAt: new Date(), updatedAt: new Date(),
});

describe("XProvider", () => {
  it("uses X platform capabilities", () => {
    expect(provider.platform).toBe("X");
    expect(provider.getCapabilities()).toContain("TEXT");
  });

  it("verifies a mock connected account without a network call", async () => {
    await expect(provider.verifyConnection(account)).resolves.toBe(true);
  });

  it("publishes a mock text post", async () => {
    const result = await provider.publish({ workspaceId: "ws-1", platform: "X", account, content: content("Hello from AI Social Media Studio") });
    expect(result.success).toBe(true);
    expect(result.externalPostId).toMatch(/^x-post-/);
  });

  it("supports affiliate content", async () => {
    const result = await provider.publish({ workspaceId: "ws-1", platform: "X", account, content: content("Check this useful product", "AFFILIATE_PRODUCT") });
    expect(result.success).toBe(true);
  });

  it("handles empty text as a failure", async () => {
    const result = await provider.publish({ workspaceId: "ws-1", platform: "X", account, content: content("") });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("requires text");
  });
});
