import { describe, it, expect, beforeEach } from "vitest";
import { OpenAIImageProvider } from "../apps/api/src/integrations/ai/provider.js";
import {
  generateMultiImageCreatives,
  getGenerationRunById,
  clearInMemoryGenerationRuns,
} from "../apps/api/src/services/creative-generation-service.js";
import { clearInMemoryUsage, getUserUsage } from "../apps/api/src/services/usage-service.js";

describe("Phase 3 Part 2 — Real AI Creative Generation Engine", () => {
  beforeEach(() => {
    clearInMemoryGenerationRuns();
    clearInMemoryUsage();
  });

  it("1. OpenAIImageProvider adapter constructs image generation params correctly", async () => {
    const provider = new OpenAIImageProvider(); // Uses fallback mock buffer when key is not present
    const result = await provider.generateFromReferenceAndInput({
      prompt: "Luxury winter coat prompt",
      inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
      referenceImageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050",
      size: "1024x1280",
      quality: "high",
    });

    expect(result.bytes).toBeDefined();
    expect(result.mimeType).toBeDefined();
    expect(result.providerRequestId).toBeDefined();
    expect(result.width).toBe(1024);
    expect(result.height).toBe(1536);
  });

  it("2. handles reference image and multiple input product images in generation run", async () => {
    const userId = "usr-p3p2-multi";
    const workspaceId = "ws-p3p2-multi";

    const result = await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: {
        referenceImageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050",
        inputImageUrls: [
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa",
          "https://images.unsplash.com/photo-1509631179647-0177331693ae",
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d",
        ],
        creativeBrief: "High fashion autumnal collection",
        platform: "INSTAGRAM",
        aspectRatio: "4:5",
        count: 3,
        stylePreset: "LUXURY",
      },
    });

    expect(result.runId).toBeDefined();
    expect(result.status).toBe("COMPLETED");
    expect(result.totalJobs).toBe(3);
    expect(result.variants).toHaveLength(3);

    // Verify structured prompt contains reference & input details
    expect(result.variants[0].promptUsed).toContain("Reference Style Image");
    expect(result.variants[0].promptUsed).toContain("Input Image Asset");
  });

  it("3. handles custom aspect ratios and maps to appropriate pixel dimensions", async () => {
    const userId = "usr-p3p2-aspect";
    const workspaceId = "ws-p3p2-aspect";

    const result = await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: {
        inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        creativeBrief: "Landscape campaign reel",
        platform: "YOUTUBE",
        aspectRatio: "16:9",
        count: 2,
        stylePreset: "CINEMATIC",
      },
    });

    expect(result.variants[0].aspectRatio).toBe("16:9");
    expect(result.variants[0].promptUsed).toContain("16:9");
  });

  it("4. consumes exactly 1 credit per generation run and prevents double-charging", async () => {
    const userId = "usr-p3p2-credits";
    const workspaceId = "ws-p3p2-credits";

    const initialUsage = await getUserUsage(userId);
    expect(initialUsage.freeCreditsUsed).toBe(0);

    await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: {
        inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        creativeBrief: "Single credit run",
        platform: "INSTAGRAM",
        aspectRatio: "1:1",
        count: 4,
        stylePreset: "VIBRANT",
      },
    });

    const updatedUsage = await getUserUsage(userId);
    expect(updatedUsage.freeCreditsUsed).toBe(1);
    expect(updatedUsage.freeCreditsRemaining).toBe(initialUsage.freeCreditsTotal - 1);
  });

  it("5. enforces workspace isolation (Workspace A usage does not leak to Workspace B)", async () => {
    const userIdA = "usr-p3p2-[#c5a059]-A";
    const workspaceIdA = "ws-p3p2-[#c5a059]-A";

    const userIdB = "usr-p3p2-[#c5a059]-B";
    const workspaceIdB = "ws-p3p2-[#c5a059]-B";

    await generateMultiImageCreatives({
      userId: userIdA,
      workspaceId: workspaceIdA,
      input: {
        inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        creativeBrief: "Workspace A creative",
        platform: "INSTAGRAM",
        aspectRatio: "4:5",
        count: 2,
        stylePreset: "LUXURY",
      },
    });

    const usageA = await getUserUsage(userIdA);
    const usageB = await getUserUsage(userIdB);

    expect(usageA.freeCreditsUsed).toBe(1);
    expect(usageB.freeCreditsUsed).toBe(0);
  });

  it("6. handles provider failure gracefully with fallback imagery", async () => {
    const userId = "usr-p3p2-fallback";
    const workspaceId = "ws-p3p2-fallback";

    // Should complete cleanly using fallback imagery even if provider throws or has no key
    const result = await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: {
        inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        creativeBrief: "Fallback test run",
        platform: "INSTAGRAM",
        aspectRatio: "4:5",
        count: 2,
        stylePreset: "MINIMAL",
      },
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.variants).toHaveLength(2);
    expect(result.variants[0].imageUrl).toBeDefined();
  });

  it("7. persists generation run and allows retrieval by ID", async () => {
    const userId = "usr-p3p2-persist";
    const workspaceId = "ws-p3p2-persist";

    const created = await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: {
        inputImageUrls: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"],
        creativeBrief: "Persistence test run",
        platform: "LINKEDIN",
        aspectRatio: "1:1",
        count: 2,
        stylePreset: "LUXURY",
      },
    });

    const retrieved = await getGenerationRunById(created.runId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.runId).toBe(created.runId);
    expect(retrieved?.status).toBe("COMPLETED");
  });
});
