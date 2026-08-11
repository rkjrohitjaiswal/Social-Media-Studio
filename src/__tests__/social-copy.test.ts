import { describe, it, expect, vi } from "vitest";
import {
  socialCopyOutputSchema,
  buildTextSystemPrompt,
  OpenAITextProvider,
} from "../lib/ai/text-provider";
import {
  enqueueSocialCopyJob,
  getSocialCopiesByCampaign,
  updateSocialCopyUserEdit,
  updateSocialCopyApprovalStatus,
  regenerateSocialCopyForAsset,
} from "../lib/queue/social-copy-worker";

// Mock Supabase Server Client
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-test-123", email: "director@maisonlumiere.com" } },
        error: null,
      })),
    },
  })),
}));

describe("Zod Structured Social Copy Validation Schema", () => {
  it("should pass validation for valid structured social copy", () => {
    const rawData = {
      caption: "Introducing the Mediterranean resort silk gown.",
      hashtags: ["#luxuryfashion", "fashioneditorial", "#resortstyle"],
      cta: "Discover the collection.",
      altText: "A flowing white silk resort gown presented in an editorial setting.",
    };

    const result = socialCopyOutputSchema.parse(rawData);
    expect(result.caption).toContain("Introducing");
    expect(result.hashtags).toEqual(["luxuryfashion", "fashioneditorial", "resortstyle"]); // stripped '#'
    expect(result.cta).toBe("Discover the collection.");
    expect(result.altText).toContain("gown");
  });

  it("should fail validation if caption is too short", () => {
    const rawData = {
      caption: "Hi",
      hashtags: ["fashion"],
      cta: "Shop now",
      altText: "Product photo",
    };

    expect(() => socialCopyOutputSchema.parse(rawData)).toThrow();
  });
});

describe("AI System Prompt Construction & Brand Voice Rules", () => {
  it("should inject brand tone, default CTA, and anti-hallucination rules into prompt", () => {
    const prompt = buildTextSystemPrompt({
      brandName: "Maison Lumière",
      toneVoice: "Editorial",
      contentStyle: "Haute couture",
      defaultCta: "Discover the Mediterranean story.",
      campaignName: "Resort 2026",
      inputFileName: "silk-gown.jpg",
    });

    expect(prompt).toContain("Maison Lumière");
    expect(prompt).toContain("Editorial");
    expect(prompt).toContain("Discover the Mediterranean story.");
    expect(prompt).toContain("ANTI-HALLUCINATION");
    expect(prompt).toContain("clean strings WITHOUT the '#' prefix");
  });
});

describe("Social Copy Queue Worker & Idempotency", () => {
  it("should create 1 copy job per generated asset and generate social copy", async () => {
    const copy = await enqueueSocialCopyJob({
      workspaceId: "ws-copy-1",
      campaignId: "camp-copy-1",
      generationJobId: "job-img-1",
      generatedAssetId: "gen-asset-1",
      brand: {
        name: "Maison Lumière",
        toneVoice: "Editorial",
        defaultCta: "Discover the edit.",
      },
      campaign: { name: "Resort 2026" },
      inputFileName: "product-gown.jpg",
    });

    expect(copy.generatedAssetId).toBe("gen-asset-1");
    expect(copy.status).toBe("COMPLETED");
    expect(copy.caption).toBeTruthy();
    expect(copy.hashtags.length).toBeGreaterThan(0);
    expect(copy.versions).toHaveLength(1);
  });

  it("should enforce idempotency and avoid creating duplicate copy jobs for the same generated asset", async () => {
    const copy1 = await enqueueSocialCopyJob({
      workspaceId: "ws-copy-2",
      campaignId: "camp-copy-2",
      generationJobId: "job-img-2",
      generatedAssetId: "gen-asset-dup-1",
      brand: { name: "Maison Lumière", toneVoice: "Editorial" },
      campaign: { name: "Resort 2026" },
      inputFileName: "bag.jpg",
    });

    const copy2 = await enqueueSocialCopyJob({
      workspaceId: "ws-copy-2",
      campaignId: "camp-copy-2",
      generationJobId: "job-img-2",
      generatedAssetId: "gen-asset-dup-1",
      brand: { name: "Maison Lumière", toneVoice: "Editorial" },
      campaign: { name: "Resort 2026" },
      inputFileName: "bag.jpg",
    });

    expect(copy1.id).toBe(copy2.id);
  });
});

describe("Copy Editing, Versioning & Approval Workflow", () => {
  it("should allow manual user copy edits and maintain updated state", async () => {
    const copy = await enqueueSocialCopyJob({
      workspaceId: "ws-copy-3",
      campaignId: "camp-copy-3",
      generationJobId: "job-img-3",
      generatedAssetId: "gen-asset-edit-1",
      brand: { name: "Maison Lumière", toneVoice: "Editorial" },
      campaign: { name: "Resort 2026" },
      inputFileName: "shoes.jpg",
    });

    const updated = updateSocialCopyUserEdit(copy.id, {
      caption: "Custom edited caption for resort shoes.",
      cta: "Explore the new shoes.",
    });

    expect(updated?.caption).toBe("Custom edited caption for resort shoes.");
    expect(updated?.cta).toBe("Explore the new shoes.");
  });

  it("should update approval status to APPROVED", async () => {
    const copy = await enqueueSocialCopyJob({
      workspaceId: "ws-copy-4",
      campaignId: "camp-copy-4",
      generationJobId: "job-img-4",
      generatedAssetId: "gen-asset-app-1",
      brand: { name: "Maison Lumière", toneVoice: "Editorial" },
      campaign: { name: "Resort 2026" },
      inputFileName: "jacket.jpg",
    });

    const approved = updateSocialCopyApprovalStatus(copy.id, "APPROVED");
    expect(approved?.approvalStatus).toBe("APPROVED");
  });

  it("should preserve version history and reset approval status to PENDING on copy regeneration", async () => {
    const copy = await enqueueSocialCopyJob({
      workspaceId: "ws-copy-5",
      campaignId: "camp-copy-5",
      generationJobId: "job-img-5",
      generatedAssetId: "gen-asset-regen-1",
      brand: { name: "Maison Lumière", toneVoice: "Editorial" },
      campaign: { name: "Resort 2026" },
      inputFileName: "belt.jpg",
    });

    updateSocialCopyApprovalStatus(copy.id, "APPROVED");

    const regenerated = await regenerateSocialCopyForAsset(copy.generatedAssetId);
    expect(regenerated?.currentVersionNumber).toBe(2);
    expect(regenerated?.versions).toHaveLength(2);
    expect(regenerated?.approvalStatus).toBe("PENDING"); // Reset to PENDING on new version
  });
});
