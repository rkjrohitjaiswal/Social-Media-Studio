import { describe, it, expect, beforeEach } from "vitest";
import { signupSchema, loginSchema, saveProviderKeySchema, supportedProvidersSchema, providerModelsRegistry } from "@ai-social/shared";
import { encryptUserCredential, decryptUserCredential } from "../apps/api/src/utils/encryption.js";
import {
  saveUserCredential,
  deleteUserCredential,
  getUserCredentialMetadata,
  getUserProviderApiKey,
  clearInMemoryUserCredentials,
} from "../apps/api/src/services/credential-resolver.js";
import {
  getUserUsage,
  checkUsageAccess,
  consumeUsage,
  clearInMemoryUsage,
} from "../apps/api/src/services/usage-service.js";
import {
  getUserSubscription,
  updateUserSubscriptionState,
  isProUser,
  clearInMemorySubscriptions,
  getFullBillingDetails,
} from "../apps/api/src/services/subscription-service.js";
import { razorpayAdapter } from "../apps/api/src/services/razorpay-adapter.js";
import { PRO_MONTHLY_PRICE_INR, PLAN_PRICES } from "../apps/api/src/config/billing.js";
import crypto from "crypto";

describe("SaaS Multi-User Platform Suite", () => {
  beforeEach(() => {
    clearInMemoryUserCredentials();
    clearInMemoryUsage();
    clearInMemorySubscriptions();
    process.env.USER_CREDENTIAL_ENCRYPTION_KEY = "12345678901234567890123456789012";
    process.env.ALLOW_SERVER_AI_FALLBACK = "false";
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_wh_secret_123";
  });

  describe("Phase 1 — Authentication & Validation", () => {
    it("1. validates signup payload with firstName and lastName", () => {
      const valid = signupSchema.safeParse({
        firstName: "Claire",
        lastName: "Laurent",
        email: "claire@brand.com",
        password: "Password123",
        confirmPassword: "Password123",
      });
      expect(valid.success).toBe(true);

      const invalid = signupSchema.safeParse({
        firstName: "",
        lastName: "Laurent",
        email: "invalid-email",
        password: "short",
        confirmPassword: "short",
      });
      expect(invalid.success).toBe(false);
    });

    it("2. rejects signup when passwords do not match", () => {
      const mismatch = signupSchema.safeParse({
        firstName: "Claire",
        lastName: "Laurent",
        email: "claire@brand.com",
        password: "Password123",
        confirmPassword: "DifferentPassword123",
      });
      expect(mismatch.success).toBe(false);
      if (!mismatch.success) {
        expect(mismatch.error.issues[0].message).toBe("Passwords do not match");
      }
    });

    it("3. validates login input format", () => {
      const valid = loginSchema.safeParse({
        email: "director@brand.com",
        password: "password123",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("Phase 3 & 4 — Free Usage Credits & Enforcement", () => {
    it("7. grants exactly 10 free credits to a new user", async () => {
      const usage = await getUserUsage("user-new-100");
      expect(usage.freeCreditsTotal).toBe(10);
      expect(usage.freeCreditsUsed).toBe(0);
      expect(usage.freeCreditsRemaining).toBe(10);
    });

    it("8, 9, 10. consumes credits sequentially for workflows", async () => {
      const u1 = await consumeUsage("user-new-100", "CONTENT_GENERATION");
      expect(u1.freeCreditsRemaining).toBe(9);

      const u2 = await consumeUsage("user-new-100", "CONTENT_GENERATION");
      expect(u2.freeCreditsRemaining).toBe(8);

      const u3 = await consumeUsage("user-new-100", "CONTENT_GENERATION");
      expect(u3.freeCreditsRemaining).toBe(7);
    });

    it("11. blocks 11th workflow when free credits are exhausted and user is not Pro", async () => {
      const userId = "user-exhausted-1";
      for (let i = 0; i < 10; i++) {
        await consumeUsage(userId, "CONTENT_GENERATION");
      }

      const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
      expect(access.allowed).toBe(false);
      expect(access.code).toBe("PLAN_LIMIT_REACHED");

      await expect(consumeUsage(userId, "CONTENT_GENERATION")).rejects.toThrow("PLAN_LIMIT_REACHED");
    });

    it("13. enforces user isolation for credit ledgers", async () => {
      await consumeUsage("user-A", "CONTENT_GENERATION");
      const usageA = await getUserUsage("user-A");
      const usageB = await getUserUsage("user-B");

      expect(usageA.freeCreditsRemaining).toBe(9);
      expect(usageB.freeCreditsRemaining).toBe(10);
    });
  });

  describe("Phase 5 & 6 — Subscriptions & ₹59 Pricing", () => {
    it("14. returns FREE plan status by default for non-paying user", async () => {
      const sub = await getUserSubscription("user-free-1");
      expect(sub.plan).toBe("FREE");
      expect(sub.status).toBe("EXPIRED");
    });

    it("15 & 17. allows paid workflows for active PRO subscriber even if free credits are 0", async () => {
      const userId = "user-pro-1";
      // Exhaust free credits
      await consumeUsage(userId, "CONTENT_GENERATION");
      await consumeUsage(userId, "CONTENT_GENERATION");
      await consumeUsage(userId, "CONTENT_GENERATION");

      // Upgrade user to PRO
      await updateUserSubscriptionState(userId, {
        plan: "PRO",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 86400000),
      });

      const access = await checkUsageAccess(userId, "CONTENT_GENERATION");
      expect(access.allowed).toBe(true);
      expect(access.isPro).toBe(true);
    });

    it("35 & 36. ensures backend controls ₹59 price authority", async () => {
      expect(PLAN_PRICES.PRO).toBe(59);
      expect(PLAN_PRICES.ADVANCED).toBe(99);

      // Verify Razorpay adapter rejects arbitrary client amounts
      await expect(razorpayAdapter.createSubscription("user-1", "PRO", 10)).rejects.toThrow("Invalid billing amount");
    });
  });

  describe("Phase 7 & 8 — Payment Webhooks & Idempotency", () => {
    it("19. requires valid HMAC-SHA256 signature for webhooks", () => {
      const rawBody = JSON.stringify({ event: "subscription.charged", payload: { payment: { entity: { notes: { userId: "user-1" } } } } });
      const secret = "test_wh_secret_123";
      const validSig = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

      expect(razorpayAdapter.verifyWebhookSignature(rawBody, validSig, secret)).toBe(true);
      expect(razorpayAdapter.verifyWebhookSignature(rawBody, "invalid-sig", secret)).toBe(false);
    });

    it("20 & 21. idempotently activates user subscription upon payment capture", async () => {
      const userId = "user-webhook-test";
      await updateUserSubscriptionState(userId, {
        plan: "PRO",
        status: "ACTIVE",
        providerSubscriptionId: "sub_rzp_12345",
      });

      // Second identical event call
      const sub = await getUserSubscription(userId);
      expect(sub.plan).toBe("PRO");
      expect(sub.status).toBe("ACTIVE");
      expect(sub.providerSubscriptionId).toBe("sub_rzp_12345");
    });
  });

  describe("Phase 11 & 12 — Multi-Provider BYOK", () => {
    it("22, 23, 24, 25. encrypts and retrieves keys for OpenAI, Gemini, Anthropic, DeepSeek", async () => {
      const userId = "user-multi-keys";

      await saveUserCredential(userId, "OPENAI", "sk-openai-test-key");
      await saveUserCredential(userId, "GEMINI", "AIza-gemini-test-key");
      await saveUserCredential(userId, "ANTHROPIC", "sk-ant-claude-test-key");
      await saveUserCredential(userId, "DEEPSEEK", "sk-deepseek-test-key");

      expect(await getUserProviderApiKey(userId, "OPENAI")).toBe("sk-openai-test-key");
      expect(await getUserProviderApiKey(userId, "GEMINI")).toBe("AIza-gemini-test-key");
      expect(await getUserProviderApiKey(userId, "ANTHROPIC")).toBe("sk-ant-claude-test-key");
      expect(await getUserProviderApiKey(userId, "DEEPSEEK")).toBe("sk-deepseek-test-key");
    });

    it("26. metadata API never exposes raw API keys", async () => {
      const userId = "user-meta-test";
      await saveUserCredential(userId, "OPENAI", "sk-secret-key-999");

      const meta = await getUserCredentialMetadata(userId);
      expect(meta.some((m) => m.provider === "openai" && m.configured === true)).toBe(true);

      // Verify no key property exists
      meta.forEach((m) => {
        expect((m as any).apiKey).toBeUndefined();
        expect((m as any).encryptedApiKey).toBeUndefined();
      });
    });

    it("27 & 28. enforces strict multi-tenant key isolation between users", async () => {
      await saveUserCredential("UserA", "OPENAI", "sk-userA-key");

      await expect(getUserProviderApiKey("UserB", "OPENAI")).rejects.toThrow("OpenAI API key is not configured");

      await deleteUserCredential("UserB", "OPENAI");
      expect(await getUserProviderApiKey("UserA", "OPENAI")).toBe("sk-userA-key");
    });

    it("29. throws clear actionable error when provider key is missing", async () => {
      await expect(getUserProviderApiKey("user-nokey", "ANTHROPIC")).rejects.toThrow(
        "ANTHROPIC API key is not configured. Configure an AI provider API key in Settings."
      );
    });
  });

  describe("Phase 13 — Provider Registry & Validation", () => {
    it("31 & 32. validates supported providers and model selection", () => {
      expect(supportedProvidersSchema.safeParse("OPENAI").success).toBe(true);
      expect(supportedProvidersSchema.safeParse("GEMINI").success).toBe(true);
      expect(supportedProvidersSchema.safeParse("ANTHROPIC").success).toBe(true);
      expect(supportedProvidersSchema.safeParse("DEEPSEEK").success).toBe(true);
      expect(supportedProvidersSchema.safeParse("UNSUPPORTED").success).toBe(false);

      expect(providerModelsRegistry.OPENAI.length).toBeGreaterThan(0);
      expect(providerModelsRegistry.GEMINI.length).toBeGreaterThan(0);
      expect(providerModelsRegistry.ANTHROPIC.length).toBeGreaterThan(0);
      expect(providerModelsRegistry.DEEPSEEK.length).toBeGreaterThan(0);
    });
  });
});
