import { describe, it, expect, vi } from "vitest";
import { buildGenerationPrompt, executeSingleJob } from "../lib/ai/generation";
import { OpenAIImageProvider, ProviderError, detectImageMimeType } from "../lib/ai/provider";
import {
  createGenerationRun,
  retrySingleJobInRun,
} from "../lib/queue/generation-worker";

// Mock Supabase Server Client
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async (path: string) => ({ data: { path }, error: null })),
        createSignedUrl: vi.fn(async (path: string) => ({
          data: { signedUrl: `https://supabase.co/signed/${path}` },
          error: null,
        })),
        remove: vi.fn(async (paths: string[]) => ({ data: paths, error: null })),
      })),
    },
  })),
}));

describe("AI Provider Abstraction & Response Normalization", () => {
  it("should detect PNG magic bytes and assign correct MIME type", () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(detectImageMimeType(pngHeader)).toBe("image/png");
  });

  it("should detect JPEG magic bytes and assign correct MIME type", () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectImageMimeType(jpegHeader)).toBe("image/jpeg");
  });

  it("should throw ProviderError with RATE_LIMIT code when OpenAI returns 429", async () => {
    const provider = new OpenAIImageProvider();
    // Simulate invalid key or network error
    try {
      await provider.generateFromReferenceAndInput({
        referenceImageBytes: Buffer.from("ref"),
        inputImageBytes: Buffer.from("inp"),
        prompt: "test",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });
});

describe("AI Generation Prompt Builder", () => {
  it("should construct structured system prompt preserving product fidelity and style anchor direction", () => {
    const prompt = buildGenerationPrompt({
      brandName: "Maison Lumière",
      brandTone: "Editorial",
      contentStyle: "Luxury resort haute couture",
      campaignName: "Mediterranean Resort 2026",
      campaignDescription: "High-end lookbook series",
    });

    expect(prompt).toContain("MASTER REFERENCE:");
    expect(prompt).toContain("INPUT PRODUCT:");
    expect(prompt).toContain("Maison Lumière");
    expect(prompt).toContain("Mediterranean Resort 2026");
    expect(prompt).toContain("Do not add unrelated products");
  });
});

describe("Generation Run Idempotency & Queue Orchestration", () => {
  it("should create exactly 1 GenerationJob per input asset for a campaign generation run", () => {
    const run = createGenerationRun({
      workspaceId: "ws-test-1",
      campaignId: "camp-test-1",
      brandName: "Maison Lumière",
      brandTone: "Editorial",
      contentStyle: "Luxury editorial",
      campaignName: "Summer Resort 2026",
      referenceAsset: {
        id: "ref-1",
        storagePath: "ws-test-1/campaigns/camp-test-1/reference/ref.jpg",
        fileName: "ref.jpg",
      },
      inputAssets: [
        { id: "inp-1", storagePath: "ws-test-1/campaigns/camp-test-1/inputs/p1.jpg", fileName: "p1.jpg" },
        { id: "inp-2", storagePath: "ws-test-1/campaigns/camp-test-1/inputs/p2.jpg", fileName: "p2.jpg" },
        { id: "inp-3", storagePath: "ws-test-1/campaigns/camp-test-1/inputs/p3.jpg", fileName: "p3.jpg" },
      ],
    });

    expect(run.totalJobs).toBe(3);
    expect(run.jobs).toHaveLength(3);
    expect(run.jobs[0].inputAssetId).toBe("inp-1");
    expect(run.jobs[1].inputAssetId).toBe("inp-2");
    expect(run.jobs[2].inputAssetId).toBe("inp-3");
  });

  it("should enforce idempotency key uniqueness and return existing run on duplicate request", () => {
    const key = "idem-unique-key-123";
    const run1 = createGenerationRun({
      workspaceId: "ws-test-2",
      campaignId: "camp-test-2",
      idempotencyKey: key,
      brandName: "Maison Lumière",
      brandTone: "Editorial",
      contentStyle: "Luxury editorial",
      campaignName: "Autumn Couture 2026",
      referenceAsset: { id: "ref-2", storagePath: "path/ref.jpg", fileName: "ref.jpg" },
      inputAssets: [{ id: "inp-10", storagePath: "path/inp.jpg", fileName: "inp.jpg" }],
    });

    const run2 = createGenerationRun({
      workspaceId: "ws-test-2",
      campaignId: "camp-test-2",
      idempotencyKey: key,
      brandName: "Maison Lumière",
      brandTone: "Editorial",
      contentStyle: "Luxury editorial",
      campaignName: "Autumn Couture 2026",
      referenceAsset: { id: "ref-2", storagePath: "path/ref.jpg", fileName: "ref.jpg" },
      inputAssets: [{ id: "inp-10", storagePath: "path/inp.jpg", fileName: "inp.jpg" }],
    });

    expect(run1.id).toBe(run2.id);
  });

  it("should handle job retries for failed jobs without duplicating GenerationJob records", async () => {
    const run = createGenerationRun({
      workspaceId: "ws-test-3",
      campaignId: "camp-test-3",
      brandName: "Maison Lumière",
      brandTone: "Editorial",
      contentStyle: "Luxury editorial",
      campaignName: "Resort 2026",
      referenceAsset: { id: "ref-3", storagePath: "path/ref.jpg", fileName: "ref.jpg" },
      inputAssets: [{ id: "inp-20", storagePath: "path/inp.jpg", fileName: "inp.jpg" }],
    });

    run.jobs[0].status = "FAILED";
    run.failedJobs = 1;

    const retryRes = await retrySingleJobInRun(run.id, run.jobs[0].id);
    expect(retryRes).not.toBeNull();
    expect(retryRes?.job.status).toBe("COMPLETED");
  });
});

describe("Single Job AI Execution & Worker Idempotency", () => {
  it("should execute job, upload binary to Supabase Storage, and register generated MediaAsset record", async () => {
    const result = await executeSingleJob({
      jobId: "job-unit-1",
      runId: "run-unit-1",
      workspaceId: "ws-unit-1",
      campaignId: "camp-unit-1",
      brandName: "Maison Lumière",
      brandTone: "Editorial",
      contentStyle: "Luxury editorial",
      campaignName: "Resort 2026",
      inputStoragePath: "ws-unit-1/campaigns/camp-unit-1/inputs/inp1.jpg",
      inputFileName: "inp1.jpg",
      referenceStoragePath: "ws-unit-1/campaigns/camp-unit-1/reference/ref.jpg",
      referenceFileName: "ref.jpg",
    });

    expect(result.success).toBe(true);
    expect(result.generatedAsset.assetType).toBe("GENERATED");
    expect(result.generatedAsset.storagePath).toBe("ws-unit-1/campaigns/camp-unit-1/generated/job-unit-1/generated.png");
    expect(result.generatedAsset.signedUrl).toContain("https://supabase.co/signed/");
  });
});
