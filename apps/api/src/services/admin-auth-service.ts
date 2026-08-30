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

// In-Memory Hashed Password Cache (For fast warm-start lookup)
const adminPasswordHashMap = new Map<string, string>();
const activeAdminSessions = new Map<string, AdminUserSession>();

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Returns a stable HMAC secret for signing admin session tokens.
 * Survives serverless restarts and cold starts across Vercel deployments.
 */
function getAdminSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.RAZORPAY_KEY_SECRET ||
    "ai-social-studio-admin-secret-key-2026"
  );
}

/**
 * Clears in-memory caches to simulate serverless cold-start invocations in tests.
 */
export function clearInMemoryAdminState(): void {
  adminPasswordHashMap.clear();
  activeAdminSessions.clear();
}

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
    const expectedBuf = Buffer.from(expectedHash, "utf8");
    const computedBuf = Buffer.from(computedHash, "utf8");
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
 * Creates a signed admin session token that can be verified statelessly on any serverless lambda.
 */
export function createAdminSession(userId: string, email: string): AdminUserSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
  
  const payload = `${userId}:${email.toLowerCase()}:${now.getTime()}`;
  const secret = getAdminSessionSecret();
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const token = `adm_${Buffer.from(payload).toString("base64url")}.${signature}`;

  const session: AdminUserSession = {
    userId,
    email: email.toLowerCase(),
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
 * 100% Stateless HMAC verification: works across Vercel serverless cold starts.
 */
export function verifyAdminSessionToken(token?: string): AdminUserSession | null {
  if (!token || typeof token !== "string" || !token.startsWith("adm_")) return null;

  // 1. Memory store fast-path for warm lambdas
  const cachedSession = activeAdminSessions.get(token);
  if (cachedSession) {
    if (new Date() > cachedSession.expiresAt) {
      activeAdminSessions.delete(token);
      return null;
    }
    return cachedSession;
  }

  // 2. Stateless HMAC-SHA256 verification (Survives Vercel serverless cold-starts)
  try {
    const raw = token.substring(4);
    const parts = raw.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    if (!payloadB64 || !signature) return null;

    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payloadParts = payload.split(":");
    if (payloadParts.length < 3) return null;

    const userId = payloadParts[0];
    const email = payloadParts[1];
    const timestampStr = payloadParts[2];
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_TTL_MS) {
      return null;
    }

    const secret = getAdminSessionSecret();
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    if (signature.length !== expectedSig.length) {
      return null;
    }

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSig, "utf8")
    );

    if (!isMatch) return null;

    const restoredSession: AdminUserSession = {
      userId,
      email: email.toLowerCase(),
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

/**
 * Authenticates admin email and password.
 * Stateless & serverless compatible.
 */
export async function authenticateAdminCredentials(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; session?: AdminUserSession; error?: string }> {
  const email = emailInput.trim().toLowerCase();
  const envEmail = (process.env.ADMIN_EMAIL || "admin@studio.ai").trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

  let isValidPassword = false;

  // 1. Check in-memory hash cache
  const storedHash = adminPasswordHashMap.get(email);
  if (storedHash) {
    isValidPassword = verifyAdminPassword(passwordInput, storedHash);
  }

  // 2. Check environment variable credentials directly (for serverless cold-start)
  if (!isValidPassword && email === envEmail && passwordInput === envPassword) {
    isValidPassword = true;
    const newHash = hashAdminPassword(passwordInput);
    adminPasswordHashMap.set(email, newHash);
  }

  // 3. Fallback: Check if user exists in database and password matches
  if (!isValidPassword) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, isAdmin: true },
      });

      if (dbUser && dbUser.isAdmin && passwordInput === envPassword) {
        isValidPassword = true;
      }
    } catch {
      // Database offline fallback
    }
  }

  if (!isValidPassword) {
    return { success: false, error: "Invalid admin email or password" };
  }

  // Ensure user record exists in Prisma DB with isAdmin = true
  let userId = `admin_user_${crypto.createHash("md5").update(email).digest("hex").substring(0, 12)}`;
  try {
    const adminInit = await ensureInitialAdminAccount();
    if (adminInit.email === email) {
      userId = adminInit.userId;
    }
  } catch {
    // Non-fatal
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
