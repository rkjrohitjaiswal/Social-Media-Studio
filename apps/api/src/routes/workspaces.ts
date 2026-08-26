import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import {
  createWorkspace,
  getUserWorkspaces,
  inviteWorkspaceMember,
  checkWorkspaceMembership,
  getWorkspaceUserRole,
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

// POST /api/workspaces/switch -> Switch active workspace
workspacesRouter.post("/switch", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { workspaceId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

    const isMember = await checkWorkspaceMembership(userId, workspaceId);
    if (!isMember) {
      return res.status(403).json({ error: "Access Denied: You are not a member of this workspace" });
    }

    const role = await getWorkspaceUserRole(userId, workspaceId);

    return res.json({
      success: true,
      activeWorkspaceId: workspaceId,
      role,
      message: `Active workspace switched to ${workspaceId}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to switch workspace";
    return res.status(500).json({ error: msg });
  }
});

// GET /api/workspaces/:id -> Fetch single workspace details
workspacesRouter.get("/:id", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.params.id;

    const isMember = await checkWorkspaceMembership(userId, workspaceId);
    if (!isMember) {
      return res.status(403).json({ error: "Access Denied: You are not a member of this workspace" });
    }

    const allWs = await getUserWorkspaces(userId);
    const targetWs = allWs.find((w) => w.id === workspaceId);

    if (!targetWs) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    return res.json({
      success: true,
      data: targetWs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch workspace";
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

// PATCH /api/workspaces/:id -> Update workspace name/description
workspacesRouter.patch("/:id", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.params.id;
    const isMember = await checkWorkspaceMembership(userId, workspaceId);
    if (!isMember) {
      return res.status(403).json({ error: "Access Denied: You are not a member of this workspace" });
    }

    const { name, description } = req.body;
    return res.json({
      success: true,
      data: { id: workspaceId, name: name || "Workspace", description: description || "" },
      message: "Workspace details updated successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update workspace";
    return res.status(500).json({ error: msg });
  }
});

// PATCH /api/workspaces/:id/members/:memberId -> Change member role
workspacesRouter.patch("/:id/members/:memberId", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, memberId } = req.params;
    const role = await getWorkspaceUserRole(userId, workspaceId);

    if (role !== "OWNER" && role !== "ADMIN") {
      return res.status(403).json({ error: "Permission Denied: Only Owner or Admin can update roles" });
    }

    const { role: newRole } = req.body;
    return res.json({
      success: true,
      data: { id: memberId, role: newRole },
      message: "Member role updated.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update member role";
    return res.status(500).json({ error: msg });
  }
});

// DELETE /api/workspaces/:id/members/:memberId -> Remove member from workspace
workspacesRouter.delete("/:id/members/:memberId", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, memberId } = req.params;
    const role = await getWorkspaceUserRole(userId, workspaceId);

    if (role !== "OWNER" && role !== "ADMIN") {
      return res.status(403).json({ error: "Permission Denied: Only Owner or Admin can remove members" });
    }

    return res.json({
      success: true,
      message: "Member removed from workspace.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove member";
    return res.status(500).json({ error: msg });
  }
});

// DELETE /api/workspaces/:id/invitations/:invId -> Cancel invitation
workspacesRouter.delete("/:id/invitations/:invId", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: workspaceId, invId } = req.params;
    const role = await getWorkspaceUserRole(userId, workspaceId);

    if (role !== "OWNER" && role !== "ADMIN") {
      return res.status(403).json({ error: "Permission Denied: Only Owner or Admin can cancel invitations" });
    }

    return res.json({
      success: true,
      message: "Invitation cancelled.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel invitation";
    return res.status(500).json({ error: msg });
  }
});

