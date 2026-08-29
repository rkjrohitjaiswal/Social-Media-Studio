import { Router, Response } from "express";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth.js";
import { getSupabaseAdminClient } from "../config/supabase.js";

export const uploadRouter = Router();

uploadRouter.use(requireAuth as any);

// Allowed MIME types for reference images
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

// Max file size: 10 MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Magic-byte signatures for server-side MIME validation
const MAGIC_SIGNATURES: { bytes: number[]; mime: string }[] = [
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },
];

function detectMimeFromBuffer(buf: Buffer): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    const match = sig.bytes.every((b, i) => buf[i] === b);
    if (match) return sig.mime;
  }
  return null;
}

/**
 * POST /api/upload/reference-image
 *
 * Body: { fileName: string, mimeType: string, data: string (base64, no prefix) }
 * Returns: { url: string }
 */
uploadRouter.post("/reference-image", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || "demo-user-id";
    const { fileName, mimeType, data } = req.body || {};

    if (!fileName || typeof fileName !== "string") {
      return res.status(400).json({ success: false, error: "fileName is required" });
    }
    if (!mimeType || typeof mimeType !== "string") {
      return res.status(400).json({ success: false, error: "mimeType is required" });
    }
    if (!data || typeof data !== "string") {
      return res.status(400).json({ success: false, error: "data (base64) is required" });
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Invalid file type. Only JPEG, PNG, and WEBP images are accepted.",
      });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(data, "base64");
    } catch {
      return res.status(400).json({ success: false, error: "Invalid base64 data" });
    }

    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
      });
    }

    // Magic-byte check to prevent MIME spoofing
    const detectedMime = detectMimeFromBuffer(fileBuffer);
    const isWebp =
      detectedMime === "image/webp" &&
      fileBuffer.length >= 12 &&
      fileBuffer.slice(8, 12).toString("ascii") === "WEBP";
    const validMagic =
      detectedMime === "image/jpeg" || detectedMime === "image/png" || isWebp;

    if (!validMagic) {
      return res.status(400).json({
        success: false,
        error: "File content does not match a supported image format (JPEG, PNG, or WEBP).",
      });
    }

    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const storagePath = `reference-images/${userId}/${timestamp}_${sanitizedName}`;

    const supabase = getSupabaseAdminClient();

    const { error: uploadError } = await supabase.storage
      .from("campaign-assets")
      .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.error("[upload/reference-image] Supabase upload error:", uploadError.message);
      // Dev fallback when bucket is not yet configured
      if (process.env.NODE_ENV !== "production") {
        return res.status(201).json({
          success: true,
          url: `data:${mimeType};base64,${data}`,
          _dev: "Storage bucket not configured — returning data URL for local dev",
        });
      }
      return res.status(500).json({
        success: false,
        error: "Failed to upload image. Please try again.",
      });
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("campaign-assets")
      .createSignedUrl(storagePath, 365 * 24 * 3600);

    if (signedError || !signedData?.signedUrl) {
      return res.status(500).json({
        success: false,
        error: "Image uploaded but could not generate access URL.",
      });
    }

    return res.status(201).json({ success: true, url: signedData.signedUrl, storagePath });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected upload error";
    console.error("[upload/reference-image] Error:", msg);
    return res.status(500).json({ success: false, error: msg });
  }
});
