import { z } from "zod";

export const ALLOWED_CAMPAIGN_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_CAMPAIGN_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export const campaignSetupSchema = z.object({
  name: z.string().min(2, "Campaign name must be at least 2 characters long"),
  brandId: z.string().min(1, "Please select a target brand for this campaign"),
  description: z.string().optional().nullable(),
});

export type CampaignSetupInput = z.infer<typeof campaignSetupSchema>;

export function validateCampaignAssetFile(file: { type: string; size: number; name: string }) {
  if (!ALLOWED_CAMPAIGN_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload JPEG, PNG, or WebP images.",
    };
  }
  if (file.size > MAX_CAMPAIGN_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "File size exceeds the 20MB maximum limit.",
    };
  }
  return { valid: true, error: null };
}

export function sanitizeCampaignFileName(fileName: string): string {
  const basename = fileName.split(/[/\\]/).pop() || "asset";
  const extension = basename.split(".").pop()?.toLowerCase() || "jpg";
  const cleanName = basename
    .substring(0, basename.lastIndexOf("."))
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${Date.now()}_${cleanName}.${extension}`;
}

export interface ServerCampaignReadinessParams {
  name?: string;
  brandId?: string;
  referenceAssetId?: string | null;
  inputAssetsCount: number;
}

export function checkCampaignReadinessServer(params: ServerCampaignReadinessParams): {
  isReady: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (!params.name || params.name.trim().length < 2) {
    reasons.push("Campaign name is required (min 2 characters).");
  }
  if (!params.brandId) {
    reasons.push("A valid target brand persona must be selected.");
  }
  if (!params.referenceAssetId) {
    reasons.push("Exactly ONE master reference style image must be registered.");
  }
  if (params.inputAssetsCount < 1) {
    reasons.push("At least ONE registered product input asset is required.");
  }

  return {
    isReady: reasons.length === 0,
    reasons,
  };
}
