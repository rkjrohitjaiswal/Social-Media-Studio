import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import {
  createWorkspace,
  getUserWorkspaces,
  inviteWorkspaceMember,
} from "../services/workspace-service.js";
import { createWorkspaceSchema, inviteMemberSchema } from "@ai-social/shared";

export const workspacesRouter = Router();

// GET /api/workspaces -> Fetch workspaces for authenticated user
workspacesRouter.get("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaces = await getUserWorkspaces(userId);
    return res.json({
      success: true,
      data: workspaces,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch workspaces";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/workspaces -> Create a team workspace (BUSINESS Plan Only)
workspacesRouter.post("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = createWorkspaceSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid workspace creation payload" });
    }

    const created = await createWorkspace(userId, parse.data);
    return res.json({
      success: true,
      data: created,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create workspace";
    const status = (err as any).code === "FEATURE_NOT_AVAILABLE" ? 403 : 500;
    return res.status(status).json({ error: msg, code: (err as any).code });
  }
});

// POST /api/workspaces/:id/invitations -> Invite a member to workspace
workspacesRouter.post("/:id/invitations", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.params.id;
    const parse = inviteMemberSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ error: "Invalid member invitation payload" });
    }

    const invitation = await inviteWorkspaceMember(workspaceId, userId, parse.data);
    return res.json({
      success: true,
      message: `Invitation sent to ${parse.data.email}`,
      data: invitation,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send invitation";
    const status = (err as any).code === "PERMISSION_DENIED" ? 403 : 500;
    return res.status(status).json({ error: msg });
  }
});
