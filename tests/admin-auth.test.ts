import { describe, it, expect, beforeEach } from "vitest";
import {
  hashAdminPassword,
  verifyAdminPassword,
  authenticateAdminCredentials,
  getStoredAdminHash,
  ensureInitialAdminAccount,
  verifyAdminSessionToken,
} from "../apps/api/src/services/admin-auth-service.js";

describe("Admin Authentication System Test Suite", () => {
  const testAdminEmail = "admin-test@studio.ai";
  const testAdminPassword = "SecureAdmin@12345";

  beforeEach(async () => {
    process.env.ADMIN_EMAIL = testAdminEmail;
    process.env.ADMIN_PASSWORD = testAdminPassword;
    await ensureInitialAdminAccount();
  });

  it("1. hashes passwords securely using cryptographic PBKDF2 (never plaintext)", () => {
    const hashed = hashAdminPassword(testAdminPassword);

    expect(hashed).not.toBe(testAdminPassword);
    expect(hashed).toContain(":"); // Salt:Hash format
    expect(hashed.split(":")[0].length).toBeGreaterThan(10); // Salt present
    expect(hashed.split(":")[1].length).toBeGreaterThan(30); // Hash present

    // Verify stored password hash in admin service is not plaintext
    const stored = getStoredAdminHash(testAdminEmail);
    expect(stored).toBeDefined();
    expect(stored).not.toBe(testAdminPassword);
    expect(stored).toContain(":");
  });

  it("2. authenticates admin credentials successfully with correct password", async () => {
    const result = await authenticateAdminCredentials(testAdminEmail, testAdminPassword);

    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    expect(result.session?.email).toBe(testAdminEmail);
    expect(result.session?.isAdmin).toBe(true);
    expect(result.session?.token.startsWith("adm_")).toBe(true);
  });

  it("3. rejects admin login attempt with incorrect password", async () => {
    const result = await authenticateAdminCredentials(testAdminEmail, "WrongPassword@999");

    expect(result.success).toBe(false);
    expect(result.session).toBeUndefined();
    expect(result.error).toBe("Invalid admin email or password");
  });

  it("4. rejects admin login attempt with non-existent email", async () => {
    const result = await authenticateAdminCredentials("nonexistent@studio.ai", testAdminPassword);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid admin email or password");
  });

  it("5. verifies token signature & admin session verification", async () => {
    const auth = await authenticateAdminCredentials(testAdminEmail, testAdminPassword);
    expect(auth.success).toBe(true);
    const token = auth.session!.token;

    const verified = verifyAdminSessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe(testAdminEmail);
    expect(verified?.isAdmin).toBe(true);
  });

  it("6. rejects tampered or invalid session tokens", () => {
    const invalidToken = "adm_invalid_token_signature_123";
    const verified = verifyAdminSessionToken(invalidToken);

    expect(verified).toBeNull();
  });
});
