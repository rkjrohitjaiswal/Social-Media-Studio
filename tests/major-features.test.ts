import { describe, it, expect, beforeEach } from "vitest";
import {
  saveBrandProfile,
  getBrandProfile,
  buildBrandPromptContext,
  clearInMemoryBrandProfiles,
} from "../apps/api/src/services/brand-service.js";
import {
  repurposeContent,
  adaptContent,
} from "../apps/api/src/services/repurposing-service.js";
import { getPerformanceAdvisorReport } from "../apps/api/src/services/advisor-service.js";
import {
  createWorkspace,
  getUserWorkspaces,
  inviteWorkspaceMember,
  clearInMemoryWorkspaces,
} from "../apps/api/src/services/workspace-service.js";
import {
  createApprovalRequest,
  reviewApprovalRequest,
  getApprovalByClientToken,
  reviewClientApprovalByToken,
  clearInMemoryApprovals,
} from "../apps/api/src/services/approval-service.js";
import {
  saveUserCredential,
  clearInMemoryUserCredentials,
} from "../apps/api/src/services/credential-resolver.js";
import {
  getUserUsage,
  clearInMemoryUsage,
} from "../apps/api/src/services/usage-service.js";
import {
  updateUserSubscriptionState,
  clearInMemorySubscriptions,
} from "../apps/api/src/services/subscription-service.js";

describe("5 Major Product Features Test Suite", () => {
  beforeEach(() => {
    clearInMemoryBrandProfiles();
    clearInMemoryWorkspaces();
    clearInMemoryApprovals();
    clearInMemoryUserCredentials();
    clearInMemoryUsage();
    clearInMemorySubscriptions();
    process.env.USER_CREDENTIAL_ENCRYPTION_KEY = "12345678901234567890123456789012";
    process.env.ALLOW_SERVER_AI_FALLBACK = "false";
  });

  describe("Feature 1 — Brand Voice / Brand Kit", () => {
    it("saves and retrieves brand profile for user", async () => {
      const userId = "user-brand-1";
      const saved = await saveBrandProfile(userId, {
        brandName: "Maison Lumière",
        industry: "High Fashion",
        tone: "Sophisticated, authoritative",
        preferredVocabulary: "atelier, couture",
        wordsToAvoid: "cheap, viral hack",
        language: "English",
        timezone: "UTC",
      });

      expect(saved.brandName).toBe("Maison Lumière");

      const retrieved = await getBrandProfile(userId);
      expect(retrieved?.brandName).toBe("Maison Lumière");
      expect(retrieved?.tone).toBe("Sophisticated, authoritative");
    });

    it("builds structured brand prompt context for AI operations", async () => {
      const userId = "user-brand-prompt";
      await saveBrandProfile(userId, {
        brandName: "Aura Atelier",
        tone: "Modern Elegant",
        preferredVocabulary: "elevation, mastery",
        wordsToAvoid: "bargain",
        language: "English",
        timezone: "UTC",
      });

      const context = await buildBrandPromptContext(userId);
      expect(context).toContain("[BRAND KIT CONTEXT]");
      expect(context).toContain("Brand Name: Aura Atelier");
      expect(context).toContain("Tone of Voice: Modern Elegant");
      expect(context).toContain("Words to Avoid STRICTLY: bargain");
    });

    it("enforces multi-tenant user isolation for brand profiles", async () => {
      await saveBrandProfile("UserA", { brandName: "Brand A", language: "English", timezone: "UTC" });
      const brandB = await getBrandProfile("UserB");
      expect(brandB).toBeNull();
    });
  });

  describe("Feature 2 & 4 — AI Content Repurposing & Multi-Platform Adaptation", () => {
    it("repurposes source text into platform-specific content and consumes 1 credit", async () => {
      const userId = "user-repurpose-1";
      await saveUserCredential(userId, "OPENAI", "sk-test-key");

      const initialUsage = await getUserUsage(userId);
      expect(initialUsage.freeCreditsRemaining).toBe(3);

      const result = await repurposeContent(userId, {
        sourceText: "10 key strategies for mastering digital luxury brand storytelling.",
        targetPlatforms: ["INSTAGRAM", "LINKEDIN", "X"],
        provider: "OPENAI",
      });

      expect(result.success).toBe(true);
      expect(result.outputs.INSTAGRAM).toBeDefined();
      expect(result.outputs.LINKEDIN).toBeDefined();
      expect(result.outputs.X).toBeDefined();
      expect(result.workflowsConsumed).toBe(1);

      // Usage checked
      const postUsage = await getUserUsage(userId);
      expect(postUsage.freeCreditsRemaining).toBe(2);
    });

    it("adapts base content with platform-specific rules", async () => {
      const userId = "user-adapt-1";
      await saveUserCredential(userId, "OPENAI", "sk-test-key");

      const result = await adaptContent(userId, {
        baseContent: "Our autumn campaign drop is now live.",
        targetPlatforms: ["PINTEREST", "YOUTUBE"],
        provider: "OPENAI",
      });

      expect(result.outputs.PINTEREST.suggestedMediaPrompt).toBeDefined();
      expect(result.outputs.YOUTUBE.title).toBeDefined();
    });
  });

  describe("Feature 3 — AI Performance Advisor", () => {
    it("handles zero analytics data cleanly without inventing metrics", async () => {
      const report = await getPerformanceAdvisorReport("user-advisor-empty");
      expect(report.hasSufficientData).toBe(false);
      expect(report.message).toContain("Not enough data yet");
    });

    it("generates grounded report when content exists without consuming generation credits", async () => {
      const userId = "user-advisor-active";
      const initialUsage = await getUserUsage(userId);

      const report = await getPerformanceAdvisorReport(userId);
      const postUsage = await getUserUsage(userId);

      // Advisor analysis itself does NOT consume credits
      expect(postUsage.freeCreditsRemaining).toBe(initialUsage.freeCreditsRemaining);
    });
  });

  describe("Feature 5 — Business Workspaces & Client Approvals", () => {
    it("allows Business plan users to create workspaces", async () => {
      const ownerId = "user-business-owner";
      await updateUserSubscriptionState(ownerId, { plan: "BUSINESS", status: "ACTIVE" });

      const ws = await createWorkspace(ownerId, { name: "Maison Global Team" });
      expect(ws.name).toBe("Maison Global Team");
      expect(ws.members[0].role).toBe("OWNER");
    });

    it("rejects workspace creation for non-Business plan users", async () => {
      const ownerId = "user-free-owner";

      await expect(createWorkspace(ownerId, { name: "Unauthorized Team" })).rejects.toThrow(
        "Team workspaces are available on the Business plan."
      );
    });

    it("creates secure workspace invitations for team members", async () => {
      const ownerId = "user-inviter";
      await updateUserSubscriptionState(ownerId, { plan: "BUSINESS", status: "ACTIVE" });
      const ws = await createWorkspace(ownerId, { name: "Haute Agency" });

      const inv = await inviteWorkspaceMember(ws.id, ownerId, { email: "editor@agency.com", role: "EDITOR" });
      expect(inv.token).toBeDefined();
      expect(inv.status).toBe("PENDING");
    });

    it("creates approval request with secure client approval token", async () => {
      const userId = "user-editor-1";
      const approval = await createApprovalRequest(userId, {
        workspaceId: "ws_123",
        contentTitle: "Fall Collection Reveal",
        caption: "Discover the new autumn drop ✨",
        platform: "INSTAGRAM",
      });

      expect(approval.status).toBe("IN_REVIEW");
      expect(approval.clientToken.length).toBeGreaterThan(32);
      expect(approval.clientApprovalUrl).toContain("/approval/");
    });

    it("allows external client to view and review content via token", async () => {
      const userId = "user-editor-2";
      const approval = await createApprovalRequest(userId, {
        workspaceId: "ws_123",
        contentTitle: "Campaign Concept",
        caption: "Spring Drop Preview",
        platform: "LINKEDIN",
      });

      // 1. External client fetches public preview
      const preview = await getApprovalByClientToken(approval.clientToken);
      expect(preview?.contentTitle).toBe("Campaign Concept");

      // 2. Client approves
      const reviewed = await reviewClientApprovalByToken(approval.clientToken, {
        action: "APPROVE",
        comment: "Approved by brand director!",
      });

      expect(reviewed.status).toBe("APPROVED");
      expect(reviewed.auditLogs?.some((l) => l.action === "APPROVED")).toBe(true);
    });
  });
});
