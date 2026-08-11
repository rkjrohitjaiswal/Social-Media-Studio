import { z } from "zod";

export const ALLOWED_LOGO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const MAX_LOGO_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const BRAND_TONE_OPTIONS = [
  "Professional",
  "Luxury",
  "Minimal",
  "Friendly",
  "Bold",
  "Playful",
  "Editorial",
  "Educational",
  "Custom",
] as const;

export const CONTENT_STYLE_OPTIONS = [
  "Luxury editorial",
  "Product photography",
  "Minimal advertising",
  "Social media promotional",
  "Lifestyle",
  "Fashion editorial",
  "Corporate",
  "Creative",
  "Custom",
] as const;

export const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const brandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters"),
  description: z.string().optional().nullable(),
  primaryColor: z.string().regex(hexColorRegex, "Invalid hex color format (e.g. #0B0C0E)"),
  secondaryColor: z.string().regex(hexColorRegex, "Invalid hex color format (e.g. #F5F4F0)"),
  accentColor: z.string().regex(hexColorRegex, "Invalid hex color format (e.g. #C5A059)"),
  toneVoice: z.string().min(2, "Brand tone is required"),
  customTone: z.string().optional(),
  contentStyle: z.string().optional().nullable(),
  customContentStyle: z.string().optional(),
  targetAudience: z.string().optional().nullable(),
  defaultCta: z.string().optional().nullable(),
  website: z
    .string()
    .url("Please enter a valid URL (e.g. https://maisonlumiere.com)")
    .or(z.literal(""))
    .optional()
    .nullable(),
  instagramUsername: z.string().optional().nullable(),
  contactEmail: z
    .string()
    .email("Please enter a valid email address")
    .or(z.literal(""))
    .optional()
    .nullable(),
  contactPhone: z.string().optional().nullable(),
});

export type BrandInput = z.infer<typeof brandSchema>;

export function validateLogoFile(file: { type: string; size: number; name: string }) {
  if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Unsupported file type. Please upload a JPEG, PNG, or WebP image.",
    };
  }
  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "File size exceeds 5MB limit. Please upload a smaller image.",
    };
  }
  return { valid: true, error: null };
}

export function sanitizeFileName(fileName: string): string {
  // Prevent path traversal and strip non-safe characters
  const basename = fileName.split(/[/\\]/).pop() || "logo";
  const extension = basename.split(".").pop()?.toLowerCase() || "jpg";
  const cleanName = basename
    .substring(0, basename.lastIndexOf("."))
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${Date.now()}_${cleanName}.${extension}`;
}
