import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { getBrandProfile, saveBrandProfile } from "../services/brand-service.js";
import { brandProfileSchema } from "@ai-social/shared";

export const brandRouter = Router();

// GET /api/brand -> Fetch current user's Brand Profile
brandRouter.get("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await getBrandProfile(userId);
    return res.json({
      success: true,
      data: profile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch brand profile";
    return res.status(500).json({ error: msg });
  }
});

// PUT /api/brand -> Save / update current user's Brand Profile
brandRouter.put("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = brandProfileSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid brand profile data", details: parse.error.format() });
    }

    const saved = await saveBrandProfile(userId, parse.data);
    return res.json({
      success: true,
      message: "Brand Kit saved successfully.",
      data: saved,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save brand profile";
    return res.status(500).json({ error: msg });
  }
});
