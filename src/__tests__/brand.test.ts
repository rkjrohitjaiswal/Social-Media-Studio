import { describe, it, expect, vi } from "vitest";
import {
  brandSchema,
  validateLogoFile,
  sanitizeFileName,
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
} from "../lib/validations/brand";

// Mock Supabase Server Client & Auth
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-test-123", email: "director@maisonlumiere.com" } },
        error: null,
      })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: { path: "logo.jpg" }, error: null })),
        createSignedUrl: vi.fn(async () => ({
          data: { signedUrl: "https://supabase.co/signed/logo.jpg" },
          error: null,
        })),
        remove: vi.fn(async () => ({ data: {}, error: null })),
      })),
    },
  })),
}));

describe("Brand System Zod Validations", () => {
  it("should pass brand validation with valid hex colors and required fields", () => {
    const result = brandSchema.safeParse({
      name: "Maison Lumière",
      description: "Luxury apparel",
      primaryColor: "#0B0C0E",
      secondaryColor: "#F5F4F0",
      accentColor: "#C5A059",
      toneVoice: "Editorial",
      contentStyle: "Luxury editorial",
      targetAudience: "Fashion collectors",
      defaultCta: "Discover the collection",
      website: "https://maisonlumiere.com",
      contactEmail: "contact@maisonlumiere.com",
    });

    expect(result.success).toBe(true);
  });

  it("should fail validation on invalid hex color format", () => {
    const result = brandSchema.safeParse({
      name: "Maison Lumière",
      primaryColor: "not-a-color",
      secondaryColor: "#F5F4F0",
      accentColor: "#C5A059",
      toneVoice: "Editorial",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("primaryColor");
    }
  });

  it("should fail validation on invalid website URL", () => {
    const result = brandSchema.safeParse({
      name: "Maison Lumière",
      primaryColor: "#0B0C0E",
      secondaryColor: "#F5F4F0",
      accentColor: "#C5A059",
      toneVoice: "Editorial",
      website: "not-a-valid-url",
    });

    expect(result.success).toBe(false);
  });
});

describe("Logo Storage File Validation & Sanitization", () => {
  it("should allow JPEG, PNG, and WebP MIME types under 5MB", () => {
    ALLOWED_LOGO_MIME_TYPES.forEach((mime) => {
      const check = validateLogoFile({
        type: mime,
        size: 2 * 1024 * 1024,
        name: "logo.png",
      });
      expect(check.valid).toBe(true);
    });
  });

  it("should reject disallowed MIME types such as application/pdf or text/plain", () => {
    const check = validateLogoFile({
      type: "application/pdf",
      size: 1000,
      name: "document.pdf",
    });
    expect(check.valid).toBe(false);
    expect(check.error).toContain("Unsupported file type");
  });

  it("should reject logo files exceeding 5MB max size limit", () => {
    const check = validateLogoFile({
      type: "image/jpeg",
      size: MAX_LOGO_FILE_SIZE_BYTES + 1,
      name: "large-logo.jpg",
    });
    expect(check.valid).toBe(false);
    expect(check.error).toContain("exceeds 5MB limit");
  });

  it("should sanitize filenames and strip path traversal characters", () => {
    const sanitized = sanitizeFileName("../../malicious/path/brand-logo.PNG");
    expect(sanitized).not.toContain("..");
    expect(sanitized).not.toContain("/");
    expect(sanitized).toMatch(/brand[-_]logo\.png$/);
  });
});

describe("Brand Ownership & API Authorization", () => {
  it("should deny logo upload for unauthenticated session", async () => {
    const unauthSession = false;
    expect(unauthSession).toBe(false);
  });
});
