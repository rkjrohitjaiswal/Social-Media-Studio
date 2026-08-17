import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptUserCredential,
  decryptUserCredential,
} from "../apps/api/src/utils/encryption.js";
import {
  saveUserCredential,
  deleteUserCredential,
  getUserCredentialMetadata,
  getUserOpenAIApiKey,
  clearInMemoryUserCredentials,
} from "../apps/api/src/services/credential-resolver.js";
import { createGenerationRun } from "../apps/api/src/workers/generation-worker.js";
import { enqueueSocialCopyJob } from "../apps/api/src/workers/social-copy-worker.js";
import { enqueueQualityAnalysisJob } from "../apps/api/src/workers/quality-worker.js";
import { saveOpenAiKeySchema } from "@ai-social/shared";

describe("BYOK Multi-User API Key Architecture", () => {
  beforeEach(() => {
    clearInMemoryUserCredentials();
    delete process.env.ALLOW_SERVER_AI_FALLBACK;
  });

  describe("1. Authenticated Encryption & Decryption", () => {
    it("should encrypt and decrypt keys correctly with unique IVs", () => {
      const originalKey = "sk-proj-user-secret-api-key-12345";
      const encrypted1 = encryptUserCredential(originalKey);
      const encrypted2 = encryptUserCredential(originalKey);

      expect(encrypted1).not.toBe(originalKey);
      expect(encrypted2).not.toBe(originalKey);
      // Unique random IV means encrypted representations differ
      expect(encrypted1).not.toBe(encrypted2);

      expect(decryptUserCredential(encrypted1)).toBe(originalKey);
      expect(decryptUserCredential(encrypted2)).toBe(originalKey);
    });

    it("should throw error when decrypting invalid or tampered ciphertext", () => {
      expect(() => decryptUserCredential("invalid:token:format")).toThrow();
      expect(() => decryptUserCredential("bad_data")).toThrow();
    });
  });

  describe("2. Database & Credential Resolver Isolation", () => {
    it("should save and resolve key for specific user without storing plaintext", async () => {
      const userA = "user-uuid-1001";
      const keyA = "sk-proj-userA-key-999";

      const res = await saveUserCredential(userA, "openai", keyA);
      expect(res.configured).toBe(true);

      const resolvedKey = await getUserOpenAIApiKey(userA);
      expect(resolvedKey).toBe(keyA);

      const metadata = await getUserCredentialMetadata(userA);
      expect(metadata[0]).toEqual({
        provider: "openai",
        configured: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verification: Metadata never contains the plaintext key
      expect((metadata[0] as any).apiKey).toBeUndefined();
      expect((metadata[0] as any).encryptedApiKey).toBeUndefined();
    });

    it("should isolate User A's key from User B", async () => {
      const userA = "user-uuid-A";
      const userB = "user-uuid-B";
      const keyA = "sk-proj-userA-secret-key-111";
      const keyB = "sk-proj-userB-secret-key-222";

      await saveUserCredential(userA, "openai", keyA);
      await saveUserCredential(userB, "openai", keyB);

      expect(await getUserOpenAIApiKey(userA)).toBe(keyA);
      expect(await getUserOpenAIApiKey(userB)).toBe(keyB);

      // User B deleting their key does not affect User A
      await deleteUserCredential(userB, "openai");
      expect(await getUserOpenAIApiKey(userA)).toBe(keyA);
      await expect(getUserOpenAIApiKey(userB)).rejects.toThrow("OpenAI API key is not configured");
    });
  });

  describe("3. Fallback Policy Enforcement", () => {
    it("should error cleanly when user has no key and fallback is disabled", async () => {
      process.env.ALLOW_SERVER_AI_FALLBACK = "false";
      process.env.OPENAI_API_KEY = "sk-proj-server-fallback-key";

      await expect(getUserOpenAIApiKey("unconfigured-user")).rejects.toThrow(
        "OpenAI API key is not configured. Add your OpenAI API key in Settings."
      );
    });

    it("should allow server fallback key only when ALLOW_SERVER_AI_FALLBACK is true", async () => {
      process.env.ALLOW_SERVER_AI_FALLBACK = "true";
      process.env.OPENAI_API_KEY = "sk-proj-server-fallback-key";

      const key = await getUserOpenAIApiKey("unconfigured-user");
      expect(key).toBe("sk-proj-server-fallback-key");
    });
  });

  describe("4. Schema Validation & Input Security", () => {
    it("saveOpenAiKeySchema should accept valid OpenAI sk- keys", () => {
      const valid = saveOpenAiKeySchema.safeParse({ apiKey: "sk-proj-123456789" });
      expect(valid.success).toBe(true);
    });

    it("saveOpenAiKeySchema should reject keys not starting with sk-", () => {
      const invalid = saveOpenAiKeySchema.safeParse({ apiKey: "invalid-key-no-sk-prefix" });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain("must start with 'sk-'");
      }
    });

    it("saveOpenAiKeySchema should reject empty keys", () => {
      const invalid = saveOpenAiKeySchema.safeParse({ apiKey: "" });
      expect(invalid.success).toBe(false);
    });
  });

  describe("5. Queue & Worker Security (No API Keys in Job Payloads)", () => {
    it("createGenerationRun payload should contain userId and never raw API key", () => {
      const run = createGenerationRun({
        workspaceId: "ws-1",
        campaignId: "camp-1",
        userId: "user-123",
        brandName: "Maison",
        brandTone: "Luxury",
        campaignName: "Summer",
        referenceAsset: { id: "ref-1", storagePath: "path/ref.png", fileName: "ref.png" },
        inputAssets: [{ id: "inp-1", storagePath: "path/inp.png", fileName: "inp.png" }],
      });

      expect(run.userId).toBe("user-123");
      expect(run.jobs[0].userId).toBe("user-123");
      expect(JSON.stringify(run)).not.toContain("sk-");
    });

    it("enqueueSocialCopyJob payload should contain userId and never raw API key", async () => {
      const job = await enqueueSocialCopyJob({
        workspaceId: "ws-1",
        campaignId: "camp-1",
        userId: "user-123",
        generationJobId: "gen-1",
        generatedAssetId: "asset-1",
        brand: { name: "Maison", toneVoice: "Editorial" },
        campaign: { name: "Summer 2026" },
        inputFileName: "product.png",
      });

      expect(JSON.stringify(job)).not.toContain("sk-");
    });

    it("enqueueQualityAnalysisJob payload should contain userId and never raw API key", async () => {
      const job = await enqueueQualityAnalysisJob({
        workspaceId: "ws-1",
        campaignId: "camp-1",
        userId: "user-123",
        generatedAssetId: "asset-1",
        generatedAssetPath: "path/gen.png",
        referenceAssetPath: "path/ref.png",
        inputAssetPath: "path/inp.png",
        brandName: "Maison",
        toneVoice: "Editorial",
        campaignName: "Summer 2026",
      });

      expect(JSON.stringify(job)).not.toContain("sk-");
    });
  });
});
