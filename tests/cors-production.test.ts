import { describe, it, expect } from "vitest";
import { isAllowedCorsOrigin } from "../apps/api/src/server";

describe("Production CORS Configuration", () => {
  it("allows production Vercel frontend origin", () => {
    expect(isAllowedCorsOrigin("https://social-media-studio-web.vercel.app")).toBe(true);
  });

  it("allows Vercel preview deployment domains (*.vercel.app)", () => {
    expect(isAllowedCorsOrigin("https://my-app-git-branch.vercel.app")).toBe(true);
    expect(isAllowedCorsOrigin("https://social-media-studio-web-preview.vercel.app")).toBe(true);
  });

  it("allows localhost origins", () => {
    expect(isAllowedCorsOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedCorsOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isAllowedCorsOrigin("http://localhost:3001")).toBe(true);
  });

  it("allows non-browser requests without Origin header", () => {
    expect(isAllowedCorsOrigin(undefined)).toBe(true);
  });
});
