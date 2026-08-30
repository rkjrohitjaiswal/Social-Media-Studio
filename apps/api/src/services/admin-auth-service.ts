import crypto from "crypto";
import prisma from "@ai-social/database";

export interface AdminUserSession {
  userId: string;
  email: string;
  isAdmin: boolean;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

// In-Memory Hashed Password & Session Token Stores
const adminPasswordHashMap = new Map<string, string>();
const activeAdminSessions = new Map<string, AdminUserSession>();

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "ai-social-studio-admin-secret-key-2026";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hashes a plaintext admin password using PBKDF2 with salt.
 * Returns formatted string: "salt:hash"
 */
export function hashAdminPassword(password: string, customSalt?: string): string {
  const salt = customSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored "salt:hash" string using constant-time comparison.
 */
export function verifyAdminPassword(password: string, storedSaltAndHash?: string): boolean {
  if (!storedSaltAndHash || !storedSaltAndHash.includes(":")) return false;

  const [salt, expectedHash] = storedSaltAndHash.split(":");
  const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");

  try {
    const expectedBuf = Buffer.from(expectedHash, "hex");
    const computedBuf = Buffer.from(computedHash, "hex");
    if (expectedBuf.length !== computedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, computedBuf);
  } catch {
    return false;
  }
}

/**
 * Idempotently seeds/initializes the system admin account using ADMIN_EMAIL and ADMIN_PASSWORD env vars.
 * Hashes the password and sets `isAdmin = true` in the database.
 */
export async function ensureInitialAdminAccount(): Promise<{ email: string; userId: string }> {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@studio.ai").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

  // Hash password securely (NEVER store plaintext)
  const hashed = hashAdminPassword(adminPassword);
  adminPasswordHashMap.set(adminEmail, hashed);

  const adminUserId = `admin_user_${crypto.createHash("md5").update(adminEmail).digest("hex").substring(0, 12)}`;

  try {
    const user = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        isAdmin: true,
      },
      create: {
        id: adminUserId,
        email: adminEmail,
        fullName: "System Administrator",
        supabaseUid: adminUserId,
        isAdmin: true,
      },
      select: { id: true, email: true, isAdmin: true },
    });

    // Ensure UserUsage record exists
    await prisma.userUsage.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        freeCreditsTotal: 1000,
        freeCreditsUsed: 0,
        permanentCreditsTotal: 1000,
        permanentCreditsUsed: 0,
        monthlyCreditsAllowance: 1000,
        monthlyCreditsUsed: 0,
      },
    });

    return { email: user.email, userId: user.id };
  } catch {
    // Database offline / fallback mode
    return { email: adminEmail, userId: adminUserId };
  }
}

/**
 * Creates a signed admin session token.
 */
export function createAdminSession(userId: string, email: string): AdminUserSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
  
  const payload = `${userId}:${email}:${now.getTime()}`;
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  const token = `adm_${Buffer.from(payload).toString("base64url")}.${signature}`;

  const session: AdminUserSession = {
    userId,
    email,
    isAdmin: true,
    token,
    createdAt: now,
    expiresAt,
  };

  activeAdminSessions.set(token, session);
  return session;
}

/**
 * Validates an incoming admin session token.
 */
export function verifyAdminSessionToken(token?: string): AdminUserSession | null {
  if (!token || !token.startsWith("adm_")) return null;

  const session = activeAdminSessions.get(token);
  if (!session) {
    // Verify signature statelessly if session in memory was restarted
    try {
      const raw = token.substring(4);
      const [payloadB64, signature] = raw.split(".");
      const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
      const [userId, email, timestampStr] = payload.split(":");
      
      const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }

      const timestamp = parseInt(timestampStr, 10);
      if (Date.now() - timestamp > TOKEN_TTL_MS) return null;

      const restoredSession: AdminUserSession = {
        userId,
        email,
        isAdmin: true,
        token,
        createdAt: new Date(timestamp),
        expiresAt: new Date(timestamp + TOKEN_TTL_MS),
      };

      activeAdminSessions.set(token, restoredSession);
      return restoredSession;
    } catch {
      return null;
    }
  }

  if (new Date() > session.expiresAt) {
    activeAdminSessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Authenticates admin email and password.
 */
export async function authenticateAdminCredentials(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; session?: AdminUserSession; error?: string }> {
  await ensureInitialAdminAccount();

  const email = emailInput.trim().toLowerCase();
  const storedHash = adminPasswordHashMap.get(email);

  let isValidPassword = false;
  if (storedHash) {
    isValidPassword = verifyAdminPassword(passwordInput, storedHash);
  }

  // Also check if ADMIN_PASSWORD from env matches directly as fallback for fresh initialization
  const envEmail = (process.env.ADMIN_EMAIL || "admin@studio.ai").trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD || "Admin@12345";
  if (!isValidPassword && email === envEmail && passwordInput === envPassword) {
    isValidPassword = true;
    const newHash = hashAdminPassword(passwordInput);
    adminPasswordHashMap.set(email, newHash);
  }

  if (!isValidPassword) {
    return { success: false, error: "Invalid admin email or password" };
  }

  // Verify target user is marked as isAdmin in database
  let userId = `admin_user_${crypto.createHash("md5").update(email).digest("hex").substring(0, 12)}`;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isAdmin: true },
    });

    if (dbUser) {
      if (!dbUser.isAdmin) {
        return { success: false, error: "Forbidden: Account does not have administrative privileges" };
      }
      userId = dbUser.id;
    }
  } catch {
    // Offline fallback
  }

  const session = createAdminSession(userId, email);
  return { success: true, session };
}

/**
 * Helper to retrieve stored hashed password for unit tests.
 */
export function getStoredAdminHash(email: string): string | undefined {
  return adminPasswordHashMap.get(email.trim().toLowerCase());
}
