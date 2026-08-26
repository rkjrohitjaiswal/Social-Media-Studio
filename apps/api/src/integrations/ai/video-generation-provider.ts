import { ProviderError } from "./provider.js";
import { VideoJobDto, VideoJobStatus } from "@ai-social/shared";

export interface VideoProviderCapabilities {
  textToVideo: boolean;
  imageToVideo: boolean;
  referenceToVideo: boolean;
  multiImageToVideo: boolean;
  maxDurationSeconds: number;
  supportedAspectRatios: Array<"9:16" | "16:9" | "1:1">;
}

export interface VideoGenerationParams {
  prompt: string;
  inputImageUrls?: string[];
  referenceImageUrl?: string;
  durationSeconds?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  motionDirection?: string;
  idempotencyKey?: string;
}

export interface VideoGenerationProvider {
  name: string;
  getCapabilities(): VideoProviderCapabilities;
  generateTextToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }>;
  generateImageToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }>;
  generateMultiImageToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }>;
  getJobStatus(jobId: string): Promise<VideoJobDto>;
  cancelJob(jobId: string): Promise<{ cancelled: boolean }>;
}

// In-Memory store for Mock Provider video generation jobs
const mockProviderJobsStore = new Map<string, VideoJobDto>();

export function clearInMemoryMockVideoJobs() {
  mockProviderJobsStore.clear();
}

/**
 * Mock Video Generation Provider for dev/test environments.
 * Simulates real async AI video clip generation.
 */
export class MockVideoGenerationProvider implements VideoGenerationProvider {
  name = "Mock AI Video Provider";

  getCapabilities(): VideoProviderCapabilities {
    return {
      textToVideo: true,
      imageToVideo: true,
      referenceToVideo: true,
      multiImageToVideo: true,
      maxDurationSeconds: 60,
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
    };
  }

  private createJob(params: VideoGenerationParams): { jobId: string; status: VideoJobStatus } {
    const jobId = params.idempotencyKey || `job_mock_vid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    if (mockProviderJobsStore.has(jobId)) {
      const existing = mockProviderJobsStore.get(jobId)!;
      return { jobId: existing.jobId, status: existing.status };
    }

    const nowStr = new Date().toISOString();
    const videoUrl =
      params.inputImageUrls && params.inputImageUrls.length > 0 && params.inputImageUrls[0].endsWith(".mp4")
        ? params.inputImageUrls[0]
        : `https://storage.ai-social.studio/generated_videos/${jobId}.mp4`;

    const jobDto: VideoJobDto = {
      jobId,
      workspaceId: "demo-workspace-1",
      status: "COMPLETED",
      progressPercent: 100,
      videoUrl,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    mockProviderJobsStore.set(jobId, jobDto);
    return { jobId, status: "COMPLETED" };
  }

  async generateTextToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }> {
    return this.createJob(params);
  }

  async generateImageToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }> {
    return this.createJob(params);
  }

  async generateMultiImageToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }> {
    return this.createJob(params);
  }

  async getJobStatus(jobId: string): Promise<VideoJobDto> {
    if (mockProviderJobsStore.has(jobId)) {
      return mockProviderJobsStore.get(jobId)!;
    }

    const nowStr = new Date().toISOString();
    return {
      jobId,
      workspaceId: "demo-workspace-1",
      status: "COMPLETED",
      progressPercent: 100,
      videoUrl: `https://storage.ai-social.studio/generated_videos/${jobId}.mp4`,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
  }

  async cancelJob(jobId: string): Promise<{ cancelled: boolean }> {
    if (mockProviderJobsStore.has(jobId)) {
      const job = mockProviderJobsStore.get(jobId)!;
      job.status = "FAILED";
      job.errorMessage = "Cancelled by user";
      mockProviderJobsStore.set(jobId, job);
    }
    return { cancelled: true };
  }
}

/**
 * Runway Video Generation Provider Adapter.
 */
export class RunwayVideoGenerationProvider implements VideoGenerationProvider {
  name = "Runway Gen-3 Alpha";
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RUNWAY_API_KEY;
  }

  getCapabilities(): VideoProviderCapabilities {
    return {
      textToVideo: true,
      imageToVideo: true,
      referenceToVideo: true,
      multiImageToVideo: false, // Runway Gen-3 handles single image-to-video
      maxDurationSeconds: 10,
      supportedAspectRatios: ["9:16", "16:9"],
    };
  }

  private checkCredentials() {
    if (!this.apiKey || this.apiKey.includes("your-") || this.apiKey.trim() === "") {
      throw new ProviderError("AUTHENTICATION", "Runway API key is not configured. Add your Runway API key in Settings.");
    }
  }

  async generateTextToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }> {
    this.checkCredentials();
    throw new ProviderError("AUTHENTICATION", "Runway API key is not configured.");
  }

  async generateImageToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }> {
    this.checkCredentials();
    throw new ProviderError("AUTHENTICATION", "Runway API key is not configured.");
  }

  async generateMultiImageToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }> {
    throw new ProviderError("INVALID_REQUEST", "Runway Gen-3 does not support multi-image-to-video.");
  }

  async getJobStatus(jobId: string): Promise<VideoJobDto> {
    this.checkCredentials();
    throw new ProviderError("AUTHENTICATION", "Runway API key is not configured.");
  }

  async cancelJob(jobId: string): Promise<{ cancelled: boolean }> {
    this.checkCredentials();
    return { cancelled: false };
  }
}

/**
 * Luma Video Generation Provider Adapter.
 */
export class LumaVideoGenerationProvider implements VideoGenerationProvider {
  name = "Luma Dream Machine";
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LUMA_API_KEY;
  }

  getCapabilities(): VideoProviderCapabilities {
    return {
      textToVideo: true,
      imageToVideo: true,
      referenceToVideo: true,
      multiImageToVideo: true,
      maxDurationSeconds: 15,
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
    };
  }

  private checkCredentials() {
    if (!this.apiKey || this.apiKey.includes("your-") || this.apiKey.trim() === "") {
      throw new ProviderError("AUTHENTICATION", "Luma API key is not configured. Add your Luma API key in Settings.");
    }
  }

  async generateTextToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }> {
    this.checkCredentials();
    throw new ProviderError("AUTHENTICATION", "Luma API key is not configured.");
  }

  async generateImageToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }> {
    this.checkCredentials();
    throw new ProviderError("AUTHENTICATION", "Luma API key is not configured.");
  }

  async generateMultiImageToVideo(params: VideoGenerationParams): Promise<{ jobId: string; status: VideoJobStatus }> {
    this.checkCredentials();
    throw new ProviderError("AUTHENTICATION", "Luma API key is not configured.");
  }

  async getJobStatus(jobId: string): Promise<VideoJobDto> {
    this.checkCredentials();
    throw new ProviderError("AUTHENTICATION", "Luma API key is not configured.");
  }

  async cancelJob(jobId: string): Promise<{ cancelled: boolean }> {
    this.checkCredentials();
    return { cancelled: false };
  }
}

/**
 * Resolver for Video Generation Provider instance.
 */
export function resolveVideoGenerationProvider(providerName = "mock", apiKey?: string): VideoGenerationProvider {
  const norm = providerName.toLowerCase();
  if (norm === "runway") {
    return new RunwayVideoGenerationProvider(apiKey);
  }
  if (norm === "luma") {
    return new LumaVideoGenerationProvider(apiKey);
  }
  return new MockVideoGenerationProvider();
}
