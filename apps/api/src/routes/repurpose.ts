import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { createContentPackageSchema } from "@ai-social/shared";
import {
  createContentPackage,
  getContentPackageById,
} from "../services/content-repurposing-service.js";

export const repurposeRouter = Router();

repurposeRouter.use(requireAuth as any);

// POST /api/repurpose -> Generate Complete Multi-Platform Repurposing Package
repurposeRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId =
      (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string) || "demo-workspace-1";
    const idempotencyKey = (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;

    const parse = createContentPackageSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid content package creation payload",
        details: parse.error.format(),
      });
    }

    const result = await createContentPackage({
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
    const msg = err instanceof Error ? err.message : "Failed to create content package";
    const code = (err as any).code || "REPURPOSING_ERROR";
    const status = (err as any).statusCode || (code === "USAGE_LIMIT_REACHED" || code === "SUBSCRIPTION_REQUIRED" ? 402 : 500);

    return res.status(status).json({
      success: false,
      error: msg,
      code,
    });
  }
});

// GET /api/repurpose/jobs/:id -> Check status/details of content package
repurposeRouter.get("/jobs/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pkg = getContentPackageById(req.params.id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: "Content package job not found",
      });
    }

    return res.json({
      success: true,
      data: pkg,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch content package";
    return res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/repurpose/jobs/:id/assets -> Get repurposed child assets
repurposeRouter.get("/jobs/:id/assets", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pkg = getContentPackageById(req.params.id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: "Content package job not found",
      });
    }

    return res.json({
      success: true,
      data: {
        packageId: pkg.packageId,
        longFormVideo: pkg.longFormVideoAsset,
        shorts: pkg.shorts,
        carousel: pkg.carousel,
        xPost: pkg.xPost,
        xThread: pkg.xThread,
        platformCaptions: pkg.platformCaptions,
        thumbnailConcepts: pkg.thumbnailConcepts,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch package child assets";
    return res.status(500).json({ success: false, error: msg });
  }
});
