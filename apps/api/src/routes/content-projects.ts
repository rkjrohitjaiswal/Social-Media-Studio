import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import {
  createContentProjectSchema,
  updateContentProjectSchema,
} from "@ai-social/shared";
import {
  createContentProject,
  getContentProjectById,
  listContentProjects,
  updateContentProject,
  generateProjectPackage,
  submitProjectForReview,
  scheduleProjectAsset,
  restorePreviousVersion,
  saveProjectVersion,
  regenerateProjectScene,
  generateProjectVoiceover,
  generateProjectCaptions,
  updateProjectTextOverlays,
  patchProjectAudioState,
  renderProjectFinalVideo,
} from "../services/content-project-service.js";
import {
  createRealVideoJob,
  getRealVideoJobById,
} from "../services/real-video-generation-service.js";
import {
  generateYouTubeMetadata,
  generateYouTubeThumbnails,
  repurposeYouTubeLongForm,
  publishToYouTube,
} from "../services/youtube-studio-service.js";
import { resolveSocialPublishingProvider } from "../integrations/publishing/social-publishing-provider.js";

export const contentProjectsRouter = Router();

contentProjectsRouter.use(requireAuth as any);

// POST /api/content-projects -> Create Content Project
contentProjectsRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const parse = createContentProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid content project creation payload",
        details: parse.error.format(),
      });
    }

    const project = await createContentProject({
      userId,
      workspaceId,
      input: parse.data,
    });

    return res.json({
      success: true,
      data: project,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create content project";
    return res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/content-projects -> List Projects for Workspace
contentProjectsRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const projects = await listContentProjects(workspaceId);
    return res.json({
      success: true,
      data: projects,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list content projects";
    return res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/content-projects/:id -> Get Project Details
contentProjectsRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const project = await getContentProjectById(req.params.id, workspaceId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Content project not found or workspace access denied",
      });
    }

    return res.json({
      success: true,
      data: project,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch content project";
    return res.status(500).json({ success: false, error: msg });
  }
});

// PATCH /api/content-projects/:id -> Update Project
contentProjectsRouter.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const parse = updateContentProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid content project update payload",
        details: parse.error.format(),
      });
    }

    const updated = await updateContentProject({
      projectId: req.params.id,
      workspaceId,
      input: parse.data,
    });

    return res.json({
      success: true,
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update content project";
    return res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/content-projects/:id/assets -> Get Child Assets & Versions
contentProjectsRouter.get("/:id/assets", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const project = await getContentProjectById(req.params.id, workspaceId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Content project not found or workspace access denied",
      });
    }

    return res.json({
      success: true,
      data: {
        projectId: project.id,
        package: project.package,
        versions: project.versions,
        scheduledPosts: project.scheduledPosts,
        publishedPosts: project.publishedPosts,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch project assets";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/generate -> Trigger Package Generation
contentProjectsRouter.post("/:id/generate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const idempotencyKey = (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;

    const project = await generateProjectPackage({
      projectId: req.params.id,
      workspaceId,
      userId,
      idempotencyKey,
    });

    return res.json({
      success: true,
      data: project,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate project package";
    const code = (err as any).code || "GENERATION_ERROR";
    const status = (err as any).statusCode || (code === "USAGE_LIMIT_REACHED" || code === "SUBSCRIPTION_REQUIRED" ? 402 : 500);

    return res.status(status).json({
      success: false,
      error: msg,
      code,
    });
  }
});

// POST /api/content-projects/:id/submit-review -> Submit for Review
contentProjectsRouter.post("/:id/submit-review", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const project = await submitProjectForReview({
      projectId: req.params.id,
      workspaceId,
      userId,
    });

    return res.json({
      success: true,
      data: project,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit project for review";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/schedule -> Schedule Project Asset
contentProjectsRouter.post("/:id/schedule", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { platform = "INSTAGRAM", scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: "scheduledAt date string is required",
      });
    }

    const project = await scheduleProjectAsset({
      projectId: req.params.id,
      workspaceId,
      userId,
      platform,
      scheduledAt,
    });

    return res.json({
      success: true,
      data: project,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to schedule project asset";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/restore-version -> Restore Previous Version
contentProjectsRouter.post("/:id/restore-version", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { versionId } = req.body;

    if (!versionId) {
      return res.status(400).json({
        success: false,
        error: "versionId is required",
      });
    }

    const project = await restorePreviousVersion({
      projectId: req.params.id,
      workspaceId,
      versionId,
    });

    return res.json({
      success: true,
      data: project,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to restore version";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/save-version -> Save New Version Snapshot
contentProjectsRouter.post("/:id/save-version", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { scenes, updatedPackage, versionLabel } = req.body;

    const project = await saveProjectVersion({
      projectId: req.params.id,
      workspaceId,
      scenes,
      updatedPackage,
      versionLabel,
    });

    return res.json({
      success: true,
      data: project,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save project version";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/scenes/:sceneId/regenerate -> Target Regenerate Scene
contentProjectsRouter.post("/:id/scenes/:sceneId/regenerate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { prompt } = req.body;

    const result = await regenerateProjectScene({
      projectId: req.params.id,
      workspaceId,
      userId,
      sceneId: req.params.sceneId,
      prompt,
    });

    return res.json({
      success: true,
      data: result.project,
      regeneratedSceneId: result.regeneratedSceneId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to regenerate scene";
    const code = (err as any).code || "REGENERATION_ERROR";
    const status = (err as any).statusCode || (code === "USAGE_LIMIT_REACHED" || code === "PLAN_LIMIT_REACHED" ? 402 : 500);

    return res.status(status).json({
      success: false,
      error: msg,
      code,
    });
  }
});

// GET /api/content-projects/:id/audio -> Get Audio State
contentProjectsRouter.get("/:id/audio", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const project = await getContentProjectById(req.params.id, workspaceId);
    if (!project) {
      return res.status(404).json({ success: false, error: "Content project not found or workspace access denied" });
    }

    return res.json({
      success: true,
      data: project.audioState || {},
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch audio state";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/voiceover -> Generate Voiceover
contentProjectsRouter.post("/:id/voiceover", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const idempotencyKey = (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;
    const { text, voice, speed, language, volume } = req.body;

    const result = await generateProjectVoiceover({
      projectId: req.params.id,
      workspaceId,
      userId,
      text,
      options: { voice, speed, language, volume },
      idempotencyKey,
    });

    return res.json({
      success: true,
      data: result.project,
      audioUrl: result.audioUrl,
      durationSeconds: result.durationSeconds,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Voiceover generation failed";
    const code = (err as any).code || "VOICEOVER_ERROR";
    const status = (err as any).statusCode || (code === "USAGE_LIMIT_REACHED" || code === "PLAN_LIMIT_REACHED" ? 402 : 500);

    return res.status(status).json({ success: false, error: msg, code });
  }
});

// POST /api/content-projects/:id/music -> Select/Upload Background Music
contentProjectsRouter.post("/:id/music", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { trackId, audioUrl, volume, fadeIn, fadeOut, startTime } = req.body;

    const project = await patchProjectAudioState({
      projectId: req.params.id,
      workspaceId,
      patch: {
        music: {
          enabled: true,
          trackId: trackId || "track_luxury_lounge",
          audioUrl: audioUrl || "https://storage.ai-social.studio/audio/catalog/luxury_lounge.mp3",
          volume: volume ?? 0.25,
          fadeIn: fadeIn ?? 1.0,
          fadeOut: fadeOut ?? 1.5,
          startTime: startTime ?? 0,
        },
      },
    });

    return res.json({ success: true, data: project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Music update failed";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/captions -> Generate Smart Captions
contentProjectsRouter.post("/:id/captions", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { style, position } = req.body;

    const result = await generateProjectCaptions({
      projectId: req.params.id,
      workspaceId,
      style,
      position,
    });

    return res.json({ success: true, data: result.project, captions: result.captions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Captions generation failed";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/text-overlays -> Update Text Overlays
contentProjectsRouter.post("/:id/text-overlays", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { textOverlays } = req.body;

    const project = await updateProjectTextOverlays({
      projectId: req.params.id,
      workspaceId,
      textOverlays: Array.isArray(textOverlays) ? textOverlays : [],
    });

    return res.json({ success: true, data: project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Text overlays update failed";
    return res.status(500).json({ success: false, error: msg });
  }
});

// PATCH /api/content-projects/:id/audio -> Update Audio Settings (No Credit Charge)
contentProjectsRouter.patch("/:id/audio", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const project = await patchProjectAudioState({
      projectId: req.params.id,
      workspaceId,
      patch: req.body,
    });

    return res.json({ success: true, data: project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Patch audio state failed";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/render -> Render Final MP4 Video
contentProjectsRouter.post("/:id/render", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const idempotencyKey = (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;
    const { aspectRatio } = req.body;

    const result = await renderProjectFinalVideo({
      projectId: req.params.id,
      workspaceId,
      userId,
      aspectRatio,
      idempotencyKey,
    });

    return res.json({
      success: true,
      data: result.project,
      videoUrl: result.videoUrl,
      jobId: result.jobId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Final video render failed";
    const code = (err as any).code || "RENDER_ERROR";
    const status = (err as any).statusCode || (code === "USAGE_LIMIT_REACHED" || code === "PLAN_LIMIT_REACHED" ? 402 : 500);

    return res.status(status).json({ success: false, error: msg, code });
  }
});

// POST /api/content-projects/:id/scenes/:sceneId/video/generate -> Generate AI Video Clip for Scene
contentProjectsRouter.post("/:id/scenes/:sceneId/video/generate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const idempotencyKey = (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;
    const { prompt, inputImageUrls, referenceImageUrl, durationSeconds = 5, aspectRatio = "9:16", provider = "mock" } = req.body;

    const job = await createRealVideoJob({
      userId,
      workspaceId,
      input: {
        prompt: prompt || `AI video clip for scene ${req.params.sceneId}`,
        inputImageUrls: Array.isArray(inputImageUrls) ? inputImageUrls : [],
        referenceImageUrl,
        durationSeconds,
        aspectRatio,
        provider,
      },
      idempotencyKey,
    });

    return res.json({
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        videoUrl: job.videoUrl,
        progressPercent: job.progressPercent,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Scene AI video generation failed";
    const code = (err as any).code || "VIDEO_GEN_ERROR";
    const status = (err as any).statusCode || (code === "USAGE_LIMIT_REACHED" ? 402 : 500);
    return res.status(status).json({ success: false, error: msg, code });
  }
});

// GET /api/content-projects/video-jobs/:jobId -> Get Video Job Status
contentProjectsRouter.get("/video-jobs/:jobId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const job = await getRealVideoJobById(req.params.jobId, workspaceId);
    return res.json({
      success: true,
      data: job,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Video job query failed";
    const status = (err as any).statusCode || 500;
    return res.status(status).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/youtube/metadata -> Generate YouTube Metadata (Title, Description, Tags, Hashtags, Chapters)
contentProjectsRouter.post("/:id/youtube/metadata", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const metadata = await generateYouTubeMetadata({
      projectId: req.params.id,
      workspaceId,
    });

    return res.json({ success: true, data: metadata });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "YouTube metadata generation failed";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/youtube/thumbnails -> Generate 16:9 YouTube Thumbnails
contentProjectsRouter.post("/:id/youtube/thumbnails", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const result = await generateYouTubeThumbnails({
      projectId: req.params.id,
      workspaceId,
      userId,
    });

    return res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "YouTube thumbnail generation failed";
    const status = (err as any).statusCode || 500;
    return res.status(status).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/youtube/publish -> Publish project to YouTube
contentProjectsRouter.post("/:id/youtube/publish", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { privacyStatus, scheduledAt, tags } = req.body || {};

    const result = await publishToYouTube({
      projectId: req.params.id,
      workspaceId,
      userId,
      privacyStatus,
      scheduledAt,
      tags,
    });

    return res.json({ success: result.success, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "YouTube publishing failed";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/content-projects/:id/publish-social -> Publish to Social Platform (Instagram, LinkedIn, X)
contentProjectsRouter.post("/:id/publish-social", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { platform = "INSTAGRAM", caption, mediaUrls, mediaType = "IMAGE" } = req.body || {};

    const provider = resolveSocialPublishingProvider(platform);
    const result = await provider.publishPost({
      workspaceId,
      userId,
      content: caption || "",
      mediaUrls,
      mediaType,
      idempotencyKey: `pub_route_${req.params.id}_${Date.now()}`,
    });

    return res.json({ success: result.success, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Social publishing failed";
    return res.status(500).json({ success: false, error: msg });
  }
});

