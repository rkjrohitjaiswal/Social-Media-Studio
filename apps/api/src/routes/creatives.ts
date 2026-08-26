import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { generateCreativesSchema } from "@ai-social/shared";
import {
  generateMultiImageCreatives,
  getGenerationRunById,
} from "../services/creative-generation-service.js";

export const creativesRouter = Router();

creativesRouter.use(requireAuth as any);

// POST /api/creatives/generate -> Trigger Multi-Image AI Creative Generation (Consumes 1 Credit)
creativesRouter.post("/generate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";

    const parse = generateCreativesSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid creative generation payload",
        details: parse.error.format(),
      });
    }

    const result = await generateMultiImageCreatives({
      userId,
      workspaceId,
      input: parse.data,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate multi-image creatives";
    const code = (err as any).code || "GENERATION_ERROR";
    const status = (err as any).statusCode || (code === "USAGE_LIMIT_REACHED" || code === "SUBSCRIPTION_REQUIRED" ? 402 : 500);

    return res.status(status).json({
      success: false,
      error: msg,
      code,
    });
  }
});

// GET /api/creatives/runs/:runId -> Get Generation Run status & variants
creativesRouter.get("/runs/:runId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const run = await getGenerationRunById(req.params.runId);
    if (!run) {
      return res.status(404).json({
        success: false,
        error: "Generation run not found",
      });
    }

    return res.json({
      success: true,
      data: run,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch generation run";
    return res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/creatives/upload-asset -> Upload image asset & return MediaAsset metadata
creativesRouter.post("/upload-asset", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileName, mimeType, fileSizeBytes, isReference, url } = req.body || {};
    const workspaceId = (req.headers["x-workspace-id"] as string) || "demo-workspace-1";

    const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const publicUrl =
      url ||
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop";

    return res.status(201).json({
      success: true,
      data: {
        id: assetId,
        workspaceId,
        fileName: fileName || "uploaded_image.png",
        mimeType: mimeType || "image/png",
        fileSizeBytes: fileSizeBytes || 102400,
        isReference: Boolean(isReference),
        assetType: isReference ? "REFERENCE" : "INPUT",
        publicUrl,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to upload media asset";
    return res.status(500).json({ success: false, error: msg });
  }
});
