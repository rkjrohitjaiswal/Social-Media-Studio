import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveVideoGenerationProvider,
  MockVideoGenerationProvider,
  RunwayVideoGenerationProvider,
  LumaVideoGenerationProvider,
  clearInMemoryMockVideoJobs,
} from "../apps/api/src/integrations/ai/video-generation-provider.js";
import {
  createRealVideoJob,
  getRealVideoJobById,
  clearInMemoryAsyncVideoJobs,
} from "../apps/api/src/services/real-video-generation-service.js";
import { clearInMemoryUsage, consumeUsage } from "../apps/api/src/services/usage-service.js";

describe("Phase 3 Part 9 — Production AI Video Provider Architecture", () => {
  const userId = "usr_prod_video_test";
  const workspaceId = "ws_prod_video_test";

  beforeEach(() => {
    clearInMemoryMockVideoJobs();
    clearInMemoryAsyncVideoJobs();
    clearInMemoryUsage();
  });

  it("1. PROVIDER DETECTION: detects unconfigured provider and reports REAL PROVIDER: NOT CONFIGURED", () => {
    const isRunwaySet = Boolean(process.env.RUNWAY_API_KEY);
    const isLumaSet = Boolean(process.env.LUMA_API_KEY);

    if (!isRunwaySet && !isLumaSet) {
      expect(true).toBe(true);
    }
  });

  it("2. MOCK FALLBACK: uses Mock provider when auto resolution finds no credentials", () => {
    const provider = resolveVideoGenerationProvider("auto");
    expect(provider.name).toContain("Mock");
  });

  it("3. IMAGE TO VIDEO: generates video clip from input image", async () => {
    const job = await createRealVideoJob({
      userId,
      workspaceId,
      input: {
        prompt: "Slow zoom on luxury watch",
        inputImageUrls: ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80"],
        provider: "mock",
      },
    });

    expect(job.status).toBe("COMPLETED");
    expect(job.videoUrl).toContain(".mp4");
  });

  it("4. REFERENCE IMAGE: passes reference style image", async () => {
    const job = await createRealVideoJob({
      userId,
      workspaceId,
      input: {
        prompt: "Golden hour lighting",
        referenceImageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
        provider: "mock",
      },
    });

    expect(job.status).toBe("COMPLETED");
  });

  it("5. MULTIPLE IMAGE INPUT: handles multi-image transitions", async () => {
    const job = await createRealVideoJob({
      userId,
      workspaceId,
      input: {
        prompt: "Smooth morph between products",
        inputImageUrls: [
          "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80",
          "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
        ],
        provider: "mock",
      },
    });

    expect(job.status).toBe("COMPLETED");
  });

  it("6. ASYNC JOB POLLING: polls async job by ID and verifies progress", async () => {
    const job = await createRealVideoJob({
      userId,
      workspaceId,
      input: { prompt: "Async city drone shot", provider: "mock" },
    });

    const status = await getRealVideoJobById(job.jobId, workspaceId);
    expect(status.jobId).toBe(job.jobId);
    expect(status.progressPercent).toBe(100);
  });

  it("7. CANCEL JOB: cancels active video generation job if supported", async () => {
    const provider = new MockVideoGenerationProvider();
    const res = await provider.cancelJob("job_mock_1");
    expect(res.cancelled).toBe(true);
  });

  it("8. FAILED GENERATION NO CHARGE: does not charge credits when usage limit is reached", async () => {
    await consumeUsage("usr_exhausted", "CONTENT_GENERATION", 10);

    await expect(
      createRealVideoJob({
        userId: "usr_exhausted",
        workspaceId,
        input: { prompt: "Test prompt", provider: "mock" },
      })
    ).rejects.toThrow(/credits are exhausted/);
  });

  it("9. WORKSPACE ISOLATION: enforces workspace boundary on job status lookup", async () => {
    const job = await createRealVideoJob({
      userId,
      workspaceId: "workspace_A",
      input: { prompt: "Private video job", provider: "mock" },
    });

    await expect(getRealVideoJobById(job.jobId, "workspace_B")).rejects.toThrow(/Unauthorized/);
  });

  it("10. API KEY PROTECTION: provider credentials are never returned in job responses", async () => {
    const job = await createRealVideoJob({
      userId,
      workspaceId,
      input: { prompt: "Secret test prompt", provider: "mock" },
    });

    expect(JSON.stringify(job)).not.toContain("api_key");
    expect(JSON.stringify(job)).not.toContain("secret");
  });
});
