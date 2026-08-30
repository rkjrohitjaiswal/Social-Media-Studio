import { Router, Response } from "express";
import prisma from "@ai-social/database";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { getSupabaseAdminClient } from "../config/supabase.js";

export const profileRouter = Router();

profileRouter.use(requireAuth as any);

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * GET /api/profile
 * Returns the current authenticated user profile.
 */
profileRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to fetch profile: ${msg}` });
  }
});

/**
 * POST /api/profile/avatar
 * Uploads a profile picture for the authenticated user.
 */
profileRouter.post("/avatar", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ success: false, error: "Missing imageBase64 string" });
    }

    // 1. Validate MIME Type
    const targetMime = (mimeType || "").toLowerCase();
    const isAllowed = ALLOWED_MIME_TYPES.some((m) => targetMime.includes(m) || imageBase64.startsWith(`data:${m}`));

    if (!isAllowed && !imageBase64.startsWith("data:image/")) {
      return res.status(400).json({
        success: false,
        error: "Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP.",
      });
    }

    // 2. Validate File Size (Base64 string length approximation)
    const base64Clean = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        error: "File size exceeds limit of 5MB.",
      });
    }

    let publicUrl = imageBase64;

    // 3. Attempt Supabase Storage Upload if bucket exists
    try {
      const supabase = getSupabaseAdminClient();
      const fileName = `avatars/${userId}-${Date.now()}.${targetMime.includes("png") ? "png" : "jpg"}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, buffer, {
          contentType: targetMime || "image/jpeg",
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          publicUrl = urlData.publicUrl;
        }
      }
    } catch {
      // Use data URI as resilient fallback
    }

    // 4. Update User record in Prisma
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
      select: { id: true, email: true, fullName: true, avatarUrl: true },
    });

    return res.json({
      success: true,
      message: "Profile picture updated successfully.",
      user: updatedUser,
      avatarUrl: publicUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to update avatar: ${msg}` });
  }
});

/**
 * DELETE /api/profile/avatar
 * Removes the authenticated user's profile picture.
 */
profileRouter.delete("/avatar", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: { id: true, email: true, fullName: true, avatarUrl: true },
    });

    return res.json({
      success: true,
      message: "Profile picture removed successfully.",
      user: updatedUser,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to remove avatar: ${msg}` });
  }
});
