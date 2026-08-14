import { describe, it, expect, vi } from "vitest";
import {
  encryptToken,
  decryptToken,
  generateSignedOAuthState,
  verifyOAuthState,
} from "../apps/api/src/utils/encryption.js";
import {
  MetaInstagramProvider,
} from "../apps/api/src/integrations/instagram/provider.js";
import {
  connectInstagramAccount,
  getConnectedInstagramAccount,
  disconnectInstagramAccount,
  composeFinalCaption,
  enqueueInstagramPublishJob,
  getPublicationByAsset,
} from "../apps/api/src/workers/instagram-worker.js";

// Mock Supabase Server Client
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-test-ig", email: "director@maisonlumiere.com" } },
        error: null,
      })),
    },
  })),
}));

describe("AES-256-GCM Token Encryption Security", () => {
  it("should encrypt plaintext token and successfully decrypt it back", () => {
    const rawToken = "EAAGm0PX4ZC0BA123456789SecretTokenValue";
    const encrypted = encryptToken(rawToken);

    expect(encrypted).not.toBe(rawToken);
    expect(encrypted.split(":")).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("should throw error when attempting to decrypt invalid payload", () => {
    expect(() => decryptToken("invalid-encrypted-payload")).toThrow();
  });
});

describe("OAuth State CSRF Protection & Signed Verification", () => {
  it("should generate signed OAuth state and verify valid signature & timestamp", () => {
    const state = generateSignedOAuthState("ws-security-1", "user-director");
    expect(state).toBeTruthy();

    const verified = verifyOAuthState(state);
    expect(verified.workspaceId).toBe("ws-security-1");
    expect(verified.userId).toBe("user-director");
  });

  it("should reject tampered or invalid OAuth state signatures", () => {
    const tampered = Buffer.from("fake-json::invalid-hmac").toString("base64url");
    expect(() => verifyOAuthState(tampered)).toThrow();
  });
});

describe("Instagram Account Connection & Disconnection", () => {
  it("should connect account, store encrypted token, and query status", () => {
    const account = connectInstagramAccount({
      workspaceId: "ws-ig-test-1",
      instagramUserId: "ig-user-777",
      username: "maisonlumiere_official",
      rawAccessToken: "raw-token-abc-123",
    });

    expect(account.status).toBe("CONNECTED");
    expect(account.accessTokenEncrypted).not.toBe("raw-token-abc-123");

    const fetched = getConnectedInstagramAccount("ws-ig-test-1");
    expect(fetched?.username).toBe("maisonlumiere_official");
  });

  it("should disconnect account and clear credentials", () => {
    connectInstagramAccount({
      workspaceId: "ws-ig-test-2",
      instagramUserId: "ig-user-888",
      username: "maisonlumiere_official",
      rawAccessToken: "raw-token-xyz-888",
    });

    const success = disconnectInstagramAccount("ws-ig-test-2");
    expect(success).toBe(true);

    const fetched = getConnectedInstagramAccount("ws-ig-test-2");
    expect(fetched).toBeNull();
  });
});

describe("Caption Composition Helper", () => {
  it("should compose final caption with CTA and hashtags block", () => {
    const finalCaption = composeFinalCaption(
      "Introducing Mediterranean Resort Haute Couture.",
      "Discover the story.",
      ["maisonlumiere", "hautecouture"]
    );

    expect(finalCaption).toContain("Introducing Mediterranean Resort Haute Couture.");
    expect(finalCaption).toContain("Discover the story.");
    expect(finalCaption).toContain("#maisonlumiere #hautecouture");
  });
});

describe("Instagram Publishing Approval Gating & Idempotency", () => {
  it("should reject publishing if asset is not APPROVED by human reviewer", async () => {
    connectInstagramAccount({
      workspaceId: "ws-ig-gate-1",
      instagramUserId: "ig-user-999",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-gate",
    });

    await expect(
      enqueueInstagramPublishJob({
        workspaceId: "ws-ig-gate-1",
        campaignId: "camp-1",
        generatedAssetId: "gen-unapproved-1",
        socialCopyId: "copy-1",
        caption: "Caption",
        hashtags: ["tag"],
        cta: "CTA",
        approvalStatus: "PENDING", // NOT APPROVED!
        imageStatus: "COMPLETED",
        copyStatus: "COMPLETED",
        qualityStatus: "COMPLETED",
        imageUrl: "http://example.com/image.png",
      })
    ).rejects.toThrow("Publishing Rejected");
  });

  it("should publish APPROVED asset and enforce idempotency on duplicate publish requests", async () => {
    connectInstagramAccount({
      workspaceId: "ws-ig-pub-1",
      instagramUserId: "ig-user-1000",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-pub",
    });

    const pub1 = await enqueueInstagramPublishJob({
      workspaceId: "ws-ig-pub-1",
      campaignId: "camp-1",
      generatedAssetId: "gen-approved-1",
      socialCopyId: "copy-1",
      caption: "Resort silk dress.",
      hashtags: ["luxury"],
      cta: "Shop edit.",
      approvalStatus: "APPROVED",
      imageStatus: "COMPLETED",
      copyStatus: "COMPLETED",
      qualityStatus: "COMPLETED",
      imageUrl: "http://example.com/image.png",
    });

    // Wait 50ms for worker completion
    await new Promise((r) => setTimeout(r, 50));

    const finalPub = getPublicationByAsset("gen-approved-1");
    expect(finalPub?.status).toBe("PUBLISHED");
    expect(finalPub?.instagramMediaId).toBeTruthy();

    // Idempotency test: Second request returns same publication record
    const pub2 = await enqueueInstagramPublishJob({
      workspaceId: "ws-ig-pub-1",
      campaignId: "camp-1",
      generatedAssetId: "gen-approved-1",
      socialCopyId: "copy-1",
      caption: "Resort silk dress.",
      hashtags: ["luxury"],
      cta: "Shop edit.",
      approvalStatus: "APPROVED",
      imageStatus: "COMPLETED",
      copyStatus: "COMPLETED",
      qualityStatus: "COMPLETED",
      imageUrl: "http://example.com/image.png",
    });

    expect(pub1.id).toBe(pub2.id);
  });
});

describe("MetaInstagramProvider Interface Unit Tests", () => {
  it("should verify connection with simulated access token", async () => {
    const provider = new MetaInstagramProvider();
    const verified = await provider.verifyConnection("mock-token-test", "ig-user-123456");
    expect(verified).toBe(true);
  });
});
