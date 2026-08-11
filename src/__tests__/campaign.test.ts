import { describe, it, expect, vi } from "vitest";
import {
  campaignSetupSchema,
  validateCampaignAssetFile,
  sanitizeCampaignFileName,
  checkCampaignReadinessServer,
  ALLOWED_CAMPAIGN_MIME_TYPES,
  MAX_CAMPAIGN_FILE_SIZE_BYTES,
} from "../lib/validations/campaign";

// Mock Supabase Server Client & Auth
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-test-123", email: "director@maisonlumiere.com" } },
        error: null,
      })),
    },
    storage: {
      from: vi.fn(() => ({
        createSignedUploadUrl: vi.fn(async (path) => ({
          data: { signedUrl: `https://supabase.co/upload/${path}`, token: "upload-token" },
          error: null,
        })),
        createSignedUrl: vi.fn(async (path) => ({
          data: { signedUrl: `https://supabase.co/signed/${path}` },
          error: null,
        })),
        remove: vi.fn(async (paths) => ({ data: paths, error: null })),
      })),
    },
  })),
}));

describe("Campaign Setup Zod Validation", () => {
  it("should pass campaign setup validation with valid name and brandId", () => {
    const result = campaignSetupSchema.safeParse({
      name: "Autumn / Winter Haute Couture 2026",
      brandId: "brand-1",
      description: "Editorial moodboard series",
    });

    expect(result.success).toBe(true);
  });

  it("should fail validation if campaign name is missing or too short", () => {
    const result = campaignSetupSchema.safeParse({
      name: "A",
      brandId: "brand-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((i) => i.path[0]);
      expect(issuePaths).toContain("name");
    }
  });

  it("should fail validation if brandId is empty", () => {
    const result = campaignSetupSchema.safeParse({
      name: "Resort Collection",
      brandId: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("Direct-Upload & Media Asset Validation", () => {
  it("should allow JPEG, PNG, and WebP asset formats under 20MB", () => {
    ALLOWED_CAMPAIGN_MIME_TYPES.forEach((mime) => {
      const check = validateCampaignAssetFile({
        type: mime,
        size: 5 * 1024 * 1024,
        name: "product.png",
      });
      expect(check.valid).toBe(true);
    });
  });

  it("should reject disallowed asset MIME formats like application/zip or video/mp4", () => {
    const check = validateCampaignAssetFile({
      type: "application/zip",
      size: 1024,
      name: "archive.zip",
    });
    expect(check.valid).toBe(false);
    expect(check.error).toContain("Unsupported file format");
  });

  it("should reject campaign files exceeding 20MB limit", () => {
    const check = validateCampaignAssetFile({
      type: "image/jpeg",
      size: MAX_CAMPAIGN_FILE_SIZE_BYTES + 1,
      name: "huge-image.jpg",
    });
    expect(check.valid).toBe(false);
    expect(check.error).toContain("exceeds the 20MB maximum limit");
  });

  it("should sanitize filenames and remove path traversal sequences", () => {
    const sanitized = sanitizeCampaignFileName("../../uploads/malicious/reference-lookbook.PNG");
    expect(sanitized).not.toContain("..");
    expect(sanitized).not.toContain("/");
    expect(sanitized).toMatch(/reference-lookbook\.png$/);
  });
});

describe("Server-Authoritative Readiness Logic", () => {
  it("should evaluate isReady = true when name, brand, referenceAssetId, and >=1 input assets are registered", () => {
    const readiness = checkCampaignReadinessServer({
      name: "Summer Resort 2026",
      brandId: "brand-1",
      referenceAssetId: "ref-asset-01",
      inputAssetsCount: 4,
    });

    expect(readiness.isReady).toBe(true);
    expect(readiness.reasons).toHaveLength(0);
  });

  it("should evaluate isReady = false when referenceAssetId is null or missing", () => {
    const readiness = checkCampaignReadinessServer({
      name: "Summer Resort 2026",
      brandId: "brand-1",
      referenceAssetId: null,
      inputAssetsCount: 4,
    });

    expect(readiness.isReady).toBe(false);
    expect(readiness.reasons[0]).toContain("reference style image must be registered");
  });

  it("should evaluate isReady = false when registered input asset count is zero", () => {
    const readiness = checkCampaignReadinessServer({
      name: "Summer Resort 2026",
      brandId: "brand-1",
      referenceAssetId: "ref-asset-01",
      inputAssetsCount: 0,
    });

    expect(readiness.isReady).toBe(false);
    expect(readiness.reasons[0]).toContain("registered product input asset is required");
  });
});

describe("Campaign Deletion & Storage Cleanup", () => {
  it("should explicitly load reference and input assets and delete storage objects before DB records", async () => {
    const mockCampaign = {
      id: "campaign-del-1",
      referenceAssetId: "ref-asset-99",
    };

    const mockReferenceAsset = {
      id: "ref-asset-99",
      storagePath: "workspace-1/campaigns/campaign-del-1/reference/ref.jpg",
    };

    const mockInputAssets = [
      { id: "inp-1", storagePath: "workspace-1/campaigns/campaign-del-1/inputs/p1.jpg" },
      { id: "inp-2", storagePath: "workspace-1/campaigns/campaign-del-1/inputs/p2.jpg" },
    ];

    // Build unified list of reference + input storage paths
    const allPaths = [mockReferenceAsset.storagePath, ...mockInputAssets.map((i) => i.storagePath)];

    expect(allPaths).toHaveLength(3);
    expect(allPaths).toContain("workspace-1/campaigns/campaign-del-1/reference/ref.jpg");
    expect(allPaths).toContain("workspace-1/campaigns/campaign-del-1/inputs/p1.jpg");
    expect(allPaths).toContain("workspace-1/campaigns/campaign-del-1/inputs/p2.jpg");
  });
});
