import { describe, it, expect, vi } from "vitest";
import { signupSchema, loginSchema, forgotPasswordSchema } from "@ai-social/shared";
import { updateSession } from "../apps/web/lib/supabase/middleware.ts";
import { NextRequest } from "next/server";

// Mock Supabase SSR module
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((url, key, config) => ({
    auth: {
      getUser: vi.fn().mockImplementation(async () => {
        return { data: { user: null }, error: null };
      }),
    },
  })),
}));

describe("Authentication Zod Validations", () => {
  it("should fail signup validation on invalid email or short password", () => {
    const result = signupSchema.safeParse({
      name: "C",
      email: "invalid-email",
      password: "123",
      confirmPassword: "456",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((i) => i.path[0]);
      expect(issuePaths).toContain("name");
      expect(issuePaths).toContain("email");
      expect(issuePaths).toContain("password");
      expect(issuePaths).toContain("confirmPassword");
    }
  });

  it("should pass signup validation with matching passwords and valid input", () => {
    const result = signupSchema.safeParse({
      name: "Claire Laurent",
      email: "director@maisonlumiere.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("should fail login validation with invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "",
    });

    expect(result.success).toBe(false);
  });

  it("should pass forgot password validation with valid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "director@maisonlumiere.com",
    });

    expect(result.success).toBe(true);
  });
});

describe("Route Protection Middleware", () => {
  it("should redirect unauthenticated request targeting /dashboard to /login", async () => {
    const req = new NextRequest("http://localhost:3000/dashboard");
    const res = await updateSession(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("should allow unauthenticated request targeting public root /", async () => {
    const req = new NextRequest("http://localhost:3000/");
    const res = await updateSession(req);

    expect(res.status).toBe(200);
  });
});
