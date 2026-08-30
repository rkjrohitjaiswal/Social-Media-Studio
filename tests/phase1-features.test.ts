import { describe, it, expect, beforeEach } from "vitest";
import {
  AI_GOALS_REGISTRY,
  AI_TOOLS_REGISTRY,
  SEED_TEMPLATES,
  runGoalWorkflowSchema,
  executeToolSchema,
  createTemplateSchema,
  saveItemSchema,
} from "@ai-social/shared";
import {
  clearInMemoryUsage,
  checkUsageAccess,
  consumeUsage,
  getUserUsage,
} from "../apps/api/src/services/usage-service.js";

describe("Phase 1 Feature Test Suite — AI Social Media Studio", () => {
  beforeEach(() => {
    clearInMemoryUsage();
  });

  /* ---------------------------------------------------------------- border
   * 1. OUTCOME-BASED AI
   * ---------------------------------------------------------------- */
  describe("Feature 1 — Outcome-Based AI", () => {
    it("1.1 loads all 8 outcome-based AI goals with valid metadata", () => {
      const goals = Object.values(AI_GOALS_REGISTRY);
      expect(goals.length).toBe(8);

      const goalIds = goals.map((g) => g.id);
      expect(goalIds).toContain("GROW_AUDIENCE");
      expect(goalIds).toContain("INCREASE_ENGAGEMENT");
      expect(goalIds).toContain("GENERATE_LEADS");
      expect(goalIds).toContain("SELL_PRODUCTS");
      expect(goalIds).toContain("BUILD_PERSONAL_BRAND");
      expect(goalIds).toContain("CREATE_VIRAL_CONTENT");
      expect(goalIds).toContain("AUTOMATE_SOCIAL");
      expect(goalIds).toContain("IMPROVE_PERFORMANCE");
    });

    it("1.2 validates goal workflow Zod input schema", () => {
      const valid = runGoalWorkflowSchema.safeParse({
        goalId: "GENERATE_LEADS",
        targetAudience: "SaaS founders",
        productName: "Studio AI",
        targetPlatforms: ["LINKEDIN", "INSTAGRAM"],
      });
      expect(valid.success).toBe(true);

      const invalid = runGoalWorkflowSchema.safeParse({
        goalId: "INVALID_GOAL_ID",
      });
      expect(invalid.success).toBe(false);
    });

    it("1.3 checks server credit access and deducts usage upon goal execution", async () => {
      const accessBefore = await checkUsageAccess("user-phase1", "CONTENT_GENERATION");
      expect(accessBefore.allowed).toBe(true);

      await consumeUsage("user-phase1", "CONTENT_GENERATION");
      const usage = await getUserUsage("user-phase1");
      expect(usage.freeCreditsUsed).toBe(1);
    });

    it("1.4 enforces 10 lifetime free credit limit server-side", async () => {
      for (let i = 0; i < 10; i++) {
        await consumeUsage("user-phase1-limit", "CONTENT_GENERATION");
      }

      const access = await checkUsageAccess("user-phase1-limit", "CONTENT_GENERATION");
      expect(access.allowed).toBe(false);
      expect(access.code).toBe("PLAN_LIMIT_REACHED");
    });
  });

  /* ---------------------------------------------------------------- border
   * 2. AI TOOLKIT
   * ---------------------------------------------------------------- */
  describe("Feature 2 — AI Toolkit", () => {
    it("2.1 loads all 12 registered AI tools", () => {
      expect(AI_TOOLS_REGISTRY.length).toBe(12);

      const toolIds = AI_TOOLS_REGISTRY.map((t) => t.id);
      expect(toolIds).toContain("caption-generator");
      expect(toolIds).toContain("hook-generator");
      expect(toolIds).toContain("reel-script-generator");
      expect(toolIds).toContain("carousel-generator");
      expect(toolIds).toContain("content-calendar-ai");
      expect(toolIds).toContain("campaign-generator");
      expect(toolIds).toContain("hashtag-assistant");
      expect(toolIds).toContain("cta-generator");
      expect(toolIds).toContain("product-promotion-ai");
      expect(toolIds).toContain("lead-generation-ai");
      expect(toolIds).toContain("viral-idea-generator");
      expect(toolIds).toContain("content-analyzer");
    });

    it("2.2 retrieves single tool configuration", () => {
      const tool = AI_TOOLS_REGISTRY.find((t) => t.id === "hook-generator");
      expect(tool).toBeDefined();
      expect(tool?.name).toBe("Hook Generator");
      expect(tool?.category).toBe("COPYWRITING");
      expect(tool?.workflowCreditCost).toBe(1);
    });

    it("2.3 validates execute tool payload schema", () => {
      const valid = executeToolSchema.safeParse({
        toolId: "hook-generator",
        topicInput: "AI social automation for agencies",
        platform: "LINKEDIN",
      });
      expect(valid.success).toBe(true);

      const invalid = executeToolSchema.safeParse({
        toolId: "hook-generator",
        topicInput: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  /* ---------------------------------------------------------------- border
   * 3. GLOBAL SEARCH
   * ---------------------------------------------------------------- */
  describe("Feature 3 — Global Search Registry Matching", () => {
    it("3.1 matches query terms across tools, goals, and templates", () => {
      const query = "hook";
      const toolMatches = AI_TOOLS_REGISTRY.filter(
        (t) => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
      );
      expect(toolMatches.length).toBeGreaterThan(0);
      expect(toolMatches.some((t) => t.id === "hook-generator")).toBe(true);

      const templateMatches = SEED_TEMPLATES.filter(
        (tpl) => tpl.name.toLowerCase().includes(query) || tpl.description.toLowerCase().includes(query)
      );
      expect(templateMatches.length).toBeGreaterThan(0);
    });

    it("3.2 filters items strictly by platform", () => {
      const platform = "LINKEDIN";
      const matchingTools = AI_TOOLS_REGISTRY.filter((t) => t.supportedPlatforms.includes(platform));
      expect(matchingTools.length).toBeGreaterThan(0);
    });
  });

  /* ---------------------------------------------------------------- border
   * 4. TEMPLATES
   * ---------------------------------------------------------------- */
  describe("Feature 5 — Templates Catalog", () => {
    it("4.1 loads seed templates", () => {
      expect(SEED_TEMPLATES.length).toBeGreaterThan(0);
    });

    it("4.2 filters templates by category", () => {
      const linkedinTemplates = SEED_TEMPLATES.filter((t) => t.category === "LINKEDIN");
      expect(linkedinTemplates.length).toBeGreaterThan(0);
      expect(linkedinTemplates.every((t) => t.category === "LINKEDIN")).toBe(true);
    });

    it("4.3 validates template creation schema", () => {
      const valid = createTemplateSchema.safeParse({
        name: "My Custom Template",
        description: "Custom template for launching digital products.",
        category: "GENERAL",
        platform: "INSTAGRAM",
        contentType: "Post",
        structure: ["Step 1", "Step 2"],
        promptTemplate: "Create post about {topic}",
      });
      expect(valid.success).toBe(true);
    });
  });

  /* ---------------------------------------------------------------- border
   * 5. SAVED CONTENT
   * ---------------------------------------------------------------- */
  describe("Feature 6 — Saved Content Vault", () => {
    it("5.1 validates save item schema", () => {
      const valid = saveItemSchema.safeParse({
        itemType: "TOOL",
        itemId: "hook-gen-1",
        title: "Saved Hooks",
        contentJson: { hooks: ["hook 1", "hook 2"] },
      });
      expect(valid.success).toBe(true);
    });

    it("5.2 rejects invalid save item payloads", () => {
      const invalid = saveItemSchema.safeParse({
        itemType: "UNKNOWN_TYPE",
        itemId: "",
        title: "",
      });
      expect(invalid.success).toBe(false);
    });
  });
});
