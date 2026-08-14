import { Request, Response, NextFunction } from "express";
import { getSupabaseAdminClient } from "../config/supabase.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
  workspaceId?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : req.cookies?.["sb-access-token"];

  // Default demo workspace context fallback for development/testing if no token present
  if (!token) {
    req.user = { id: "demo-user-id", email: "demo@maisonlumiere.com" };
    req.workspaceId = "demo-workspace-1";
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
    req.workspaceId = (data.user.user_metadata?.workspaceId as string) || "demo-workspace-1";
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Failed to authenticate" });
  }
}
