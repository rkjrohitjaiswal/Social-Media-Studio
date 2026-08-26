import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { composeVideoSchema, generateVideoScriptSchema } from "@ai-social/shared";
import { composeVideo, getVideoJobById } from "../services/video-composition-service.js";
import { generateVideoScript } from "../services/video-script-service.js";
import { generateVoiceover } from "../services/voiceover-service.js";
import { createSmartAIVideo } from "../services/smart-video-orchestration-service.js";

export const videoRouter = Router();

videoRouter.use(requireAuth as any);

// POST /api/video/script -> Generate AI Short Video Script & Scene Breakdown
videoRouter.post("/script", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const parse = generateVideoScriptSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid video script payload",
        details: parse.error.format(),
      });
    }

    const script = await generateVideoScript({
      userId,
      workspaceId,
      input: parse.data,
    });

    return res.json({
      success: true,
      data: script,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate video script";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/video/voiceover -> Generate Text-to-Speech Narration MP3
videoRouter.post("/voiceover", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const { text, voice, speed } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ success: false, error: "Text string is required for voiceover" });
    }

    const voiceover = await generateVoiceover({
      userId,
      workspaceId,
      text,
      options: { voice, speed },
    });

    return res.json({
      success: true,
      data: voiceover,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate voiceover";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/video/smart-create -> Quick Create Mode: Prompt -> Script -> Voice -> Captions -> FFmpeg MP4
videoRouter.post("/smart-create", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const idempotencyKey = (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ success: false, error: "Prompt string is required for Smart Create" });
    }

    const result = await createSmartAIVideo({
      userId,
      workspaceId,
      input: req.body,
      idempotencyKey,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to execute smart video creation";
    const code = (err as any).code || "SMART_CREATE_ERROR";
    const status = (err as any).statusCode || (code === "USAGE_LIMIT_REACHED" || code === "SUBSCRIPTION_REQUIRED" ? 402 : 500);

    return res.status(status).json({
      success: false,
      error: msg,
      code,
    });
  }
});

// POST /api/video/compose -> Trigger FFmpeg Local Short Video Composition (Consumes 1 Credit)
videoRouter.post("/compose", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const idempotencyKey = (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;

    const parse = composeVideoSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid video composition payload",
        details: parse.error.format(),
      });
    }

    const result = await composeVideo({
      userId,
      workspaceId,
      input: parse.data,
      idempotencyKey,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to compose short video";
    const code = (err as any).code || "COMPOSITION_ERROR";
    const status = (err as any).statusCode || (code === "USAGE_LIMIT_REACHED" || code === "SUBSCRIPTION_REQUIRED" ? 402 : 500);

    return res.status(status).json({
      success: false,
      error: msg,
      code,
    });
  }
});

// GET /api/video/jobs/:id -> Check status of video composition job
videoRouter.get("/jobs/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const job = await getVideoJobById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Video composition job not found",
      });
    }

    return res.json({
      success: true,
      data: job,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch video job status";
    return res.status(500).json({ success: false, error: msg });
  }
});
