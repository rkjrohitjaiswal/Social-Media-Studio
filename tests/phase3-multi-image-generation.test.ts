import { describe, it, expect, beforeEach } from "vitest";
import { generateCreativesSchema } from "@ai-social/shared";
import {
  generateMultiImageCreatives,
  getGenerationRunById,
  clearInMemoryGenerationRuns,
} from "../apps/api/src/services/creative-generation-service.js";
import { clearInMemoryUsage, getUserUsage } from "../apps/api/src/services/usage-service.js";

describe("Phase 3 Part 1 — Multi-Image AI Creative Generation", () => {
  beforeEach(() => {
    clearInMemoryGenerationRuns();
    clearInMemoryUsage();
  });

  it("1. validates generateCreativesSchema request payload", () => {
    // Missing input images -> INVALID
    const invalidRes1 = generateCreativesSchema.safeParse({
      inputImageUrls: [],
      creativeBrief: "Valid prompt",
    });
    expect(invalidRes1.success).toBe(false);

    // Valid payload -> VALID
    const validRes = generateCreativesSchema.safeParse({
      referenceImageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050",
      inputImageUrls: [
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
        "https://images.unsplash.com/photo-1509631179647-0177331693ae",
      ],
      creativeBrief: "Luxury winter campaign showcase",
      platform: "INSTAGRAM",
      aspectRatio: "4:5",
      count: 3,
      stylePreset: "LUXURY",
    });
    expect(validRes.success).toBe(true);
    if (validRes.success) {
      expect(validRes.data.count).toBe(3);
      expect(validRes.data.aspectRatio).toBe("4:5");
    }
  });

  it("2. generates multi-image creative variants and returns run summary DTO", async () => {
    const userId = "user-phase3-1";
    const workspaceId = "ws-phase3-1";

    const result = await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: {
        referenceImageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050",
        inputImageUrls: [
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
          "https://images.unsplash.com/photo-1509631179647-0177331693ae",
        ],
        creativeBrief: "Bespoke high-fashion autumn release",
        platform: "INSTAGRAM",
        aspectRatio: "4:5",
        count: 2,
        stylePreset: "LUXURY",
      },
    });

    expect(result.runId).toBeDefined();
    expect(result.status).toBe("COMPLETED");
    expect(result.totalJobs).toBe(2);
    expect(result.completedJobs).toBe(2);
    expect(result.variants).toHaveLength(2);

    const v1 = result.variants[0];
    expect(v1.variantNumber).toBe(1);
    expect(v1.platform).toBe("INSTAGRAM");
    expect(v1.aspectRatio).toBe("4:5");
    expect(v1.headline).toContain("Unrivaled Luxury");
    expect(v1.caption).toBeDefined();
    expect(v1.hashtags).toBeInstanceOf(Array);
    expect(v1.qualityScore).toBeGreaterThanOrEqual(9.0);
  });

  it("3. consumes exactly 1 credit for multi-image creative generation", async () => {
    const userId = "user-phase3-credit";
    const workspaceId = "ws-phase3-credit";

    const usageBefore = await getUserUsage(userId);
    expect(usageBefore.freeCreditsUsed).toBe(0);

    await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: {
        inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        creativeBrief: "Minimalist studio portrait",
        platform: "LINKEDIN",
        aspectRatio: "1:1",
        count: 3,
        stylePreset: "MINIMAL",
      },
    });

    const usageAfter = await getUserUsage(userId);
    expect(usageAfter.freeCreditsUsed).toBe(1);
    expect(usageAfter.freeCreditsRemaining).toBe(usageBefore.freeCreditsTotal - 1);
  });

  it("4. rejects generation when workspace credits are exhausted (402 status)", async () => {
    const userId = "user-phase3-exhausted";
    const workspaceId = "ws-phase3-exhausted";

    // Consume all 3 credits first
    await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: {
        inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        creativeBrief: "Run 1",
        platform: "INSTAGRAM",
        aspectRatio: "4:5",
        count: 1,
        stylePreset: "LUXURY",
      },
    });
    for (let i = 2; i <= 10; i++) {
      await generateMultiImageCreatives({
        userId,
        workspaceId,
        input: {
          inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
          creativeBrief: `Run ${i}`,
          platform: "INSTAGRAM",
          aspectRatio: "4:5",
          count: 1,
          stylePreset: "LUXURY",
        },
      });
    }

    // 11th run -> REJECTED
    await expect(
      generateMultiImageCreatives({
        userId,
        workspaceId,
        input: {
          inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
          creativeBrief: "Run 11 (Exhausted)",
          platform: "INSTAGRAM",
          aspectRatio: "4:5",
          count: 1,
          stylePreset: "LUXURY",
        },
      })
    ).rejects.toThrow(/credits are exhausted/i);
  });

  it("5. retrieves generation run details by ID", async () => {
    const userId = "user-phase3-get";
    const workspaceId = "ws-phase3-get";

    const created = await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: {
        inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        creativeBrief: "Get run test",
        platform: "PINTEREST",
        aspectRatio: "9:16",
        count: 2,
        stylePreset: "CINEMATIC",
      },
    });

    const retrieved = await getGenerationRunById(created.runId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.runId).toBe(created.runId);
    expect(retrieved?.totalJobs).toBe(2);
    expect(retrieved?.variants).toHaveLength(2);
  });
});
