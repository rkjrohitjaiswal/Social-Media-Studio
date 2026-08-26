import { describe, it, expect, vi } from "vitest";
import { strategyInputSchema, contentPillarSchema, generatePlanInputSchema, aiCampaignInputSchema } from "@ai-social/shared";

describe("Phase 2A — AI Social Content Strategy Schemas & Integration", () => {
  describe("Strategy Schemas Validation", () => {
    it("validates correct strategy input payload", () => {
      const validPayload = {
        primaryGoal: "GENERATE_LEADS",
        targetAudience: "SaaS Founders",
        industry: "Technology",
        brandName: "Haute AI",
        platforms: ["INSTAGRAM", "LINKEDIN"],
        postingFrequency: "Daily",
      };

      const result = strategyInputSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects strategy input payload with empty platforms array", () => {
      const invalidPayload = {
        primaryGoal: "GENERATE_LEADS",
        targetAudience: "SaaS Founders",
        platforms: [],
      };

      const result = strategyInputSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("Content Pillars Schemas Validation", () => {
    it("validates valid content pillar payload", () => {
      const validPillar = {
        name: "Educational Carousels",
        description: "Step-by-step technical teardowns",
        purpose: "Build trust and domain authority",
        percentageAllocation: 40,
        color: "#c5a059",
      };

      const result = contentPillarSchema.safeParse(validPillar);
      expect(result.success).toBe(true);
    });

    it("rejects pillar with empty name", () => {
      const invalidPillar = {
        name: "",
        description: "Test description",
      };

      const result = contentPillarSchema.safeParse(invalidPillar);
      expect(result.success).toBe(false);
    });
  });

  describe("Content Plan & Calendar Schemas Validation", () => {
    it("validates 7-day and 30-day plan inputs", () => {
      const valid7Day = {
        planType: "SEVEN_DAY",
        platforms: ["INSTAGRAM", "LINKEDIN"],
      };

      const valid30Day = {
        planType: "THIRTY_DAY",
        platforms: ["INSTAGRAM", "LINKEDIN", "YOUTUBE"],
      };

      expect(generatePlanInputSchema.safeParse(valid7Day).success).toBe(true);
      expect(generatePlanInputSchema.safeParse(valid30Day).success).toBe(true);
    });
  });

  describe("Campaign Planner Schemas Validation", () => {
    it("validates AI campaign blueprint payload", () => {
      const validCampaign = {
        name: "Product Launch Campaign",
        objective: "Drive trial signups",
        productService: "Haute AI Studio",
        targetAudience: "Agencies & Founders",
        platforms: ["INSTAGRAM", "LINKEDIN"],
        cta: "Sign up free today",
      };

      const result = aiCampaignInputSchema.safeParse(validCampaign);
      expect(result.success).toBe(true);
    });

    it("rejects campaign without name or objective", () => {
      const invalidCampaign = {
        name: "",
        objective: "",
        platforms: ["INSTAGRAM"],
      };

      const result = aiCampaignInputSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });
  });
});
