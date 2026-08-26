import { Request, Response, NextFunction } from "express";
import { getSupabaseAdminClient } from "../config/supabase.js";
import { prisma } from "@ai-social/database";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
  workspaceId?: string;
}

async function ensureUserExists(id: string, email: string) {
  try {
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email,
        supabaseUid: id,
        fullName: "Claire Laurent",
      },
    });
  } catch {
    // Graceful fallback if database connection or schema is unmigrated in dev
  }
}

/**
 * Resolves the requested workspace ID from the x-workspace-id header.
 * Falls back to "demo-workspace-1".
 * NOTE: this value is only the *requested* workspace — routes/services must
 * still validate that the authenticated user is a member.
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
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : req.cookies?.["sb-access-token"];

  // Default demo workspace context fallback for development/testing if no token present
  if (!token) {
    req.user = { id: "demo-user-id", email: "demo@maisonlumiere.com" };
    req.workspaceId = resolveWorkspaceId(req);
    await ensureUserExists(req.user.id, req.user.email!);
    return next();
  }

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
    // x-workspace-id header takes precedence over the JWT metadata value so that
    // workspace switching from the frontend is reflected immediately.
    req.workspaceId = resolveWorkspaceId(req);
    await ensureUserExists(req.user.id, req.user.email || "user@studio.ai");
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Failed to authenticate" });
  }
}
