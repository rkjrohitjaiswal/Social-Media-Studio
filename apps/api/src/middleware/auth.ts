import { Request, Response, NextFunction } from "express";
import { getSupabaseAdminClient } from "../config/supabase.js";
import { prisma } from "@ai-social/database";
import { verifyAdminSessionToken } from "../services/admin-auth-service.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    isAdmin?: boolean;
  };
  workspaceId?: string;
}

async function ensureUserExists(id: string, email: string) {
  try {
    const user = await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email,
        supabaseUid: id,
        fullName: "Studio User",
      },
      select: { id: true, isAdmin: true },
    });

    // Ensure initial UserUsage record with 10 permanent free credits exists for new user
    await prisma.userUsage.upsert({
      where: { userId: id },
      update: {},
      create: {
        userId: id,
        freeCreditsTotal: 10,
        freeCreditsUsed: 0,
        permanentCreditsTotal: 10,
        permanentCreditsUsed: 0,
        monthlyCreditsAllowance: 3,
        monthlyCreditsUsed: 0,
      },
    });

    return user;
  } catch {
    // Graceful fallback if database connection or schema is unmigrated in dev
    return null;
  }
}

/**
 * Resolves the requested workspace ID from the x-workspace-id header.
 * Falls back to "demo-workspace-1".
 */
function resolveWorkspaceId(req: Request): string {
  const headerValue = req.headers["x-workspace-id"];
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }
  return "demo-workspace-1";
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : req.cookies?.["admin-access-token"] || req.cookies?.["sb-access-token"];

  // 1. Check for dedicated Admin Session Token first
  if (token && token.startsWith("adm_")) {
    const adminSession = verifyAdminSessionToken(token);
    if (adminSession) {
      req.user = {
        id: adminSession.userId,
        email: adminSession.email,
        isAdmin: true,
      };
      req.workspaceId = resolveWorkspaceId(req);
      return next();
    }
  }

  // 2. Check for x-user-id header (Test / Dev override)
  const xUserId = req.headers["x-user-id"];
  if (typeof xUserId === "string" && xUserId.trim().length > 0) {
    req.user = { id: xUserId.trim(), email: `${xUserId.trim()}@studio.ai` };
    req.workspaceId = resolveWorkspaceId(req);
    const dbUser = await ensureUserExists(req.user.id, req.user.email!);
    if (dbUser) req.user.isAdmin = dbUser.isAdmin;
    return next();
  }

  // 3. Default demo workspace context fallback for development/testing if no token present
  if (!token) {
    req.user = { id: "demo-user-id", email: "demo@maisonlumiere.com" };
    req.workspaceId = resolveWorkspaceId(req);
    const dbUser = await ensureUserExists(req.user.id, req.user.email!);
    if (dbUser) req.user.isAdmin = dbUser.isAdmin;
    return next();
  }

  // 4. Verify Supabase JWT token
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
    };
    req.workspaceId = resolveWorkspaceId(req);
    const dbUser = await ensureUserExists(req.user.id, req.user.email || "user@studio.ai");
    if (dbUser) req.user.isAdmin = dbUser.isAdmin;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Failed to authenticate" });
  }
}

/**
 * Enforces global application-level admin authorization strictly server-side.
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, error: "Unauthorized: Missing session" });
  }

  if (req.user.isAdmin === true) {
    return next();
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, isAdmin: true },
    });

    if (!dbUser || !dbUser.isAdmin) {
      return res.status(403).json({ success: false, error: "Forbidden: Application admin access required" });
    }

    req.user.isAdmin = true;
    next();
  } catch {
    return res.status(403).json({ success: false, error: "Forbidden: Failed to verify admin permissions" });
  }
}
