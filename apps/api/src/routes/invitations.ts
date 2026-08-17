import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { acceptWorkspaceInvitation } from "../services/workspace-service.js";

export const invitationsRouter = Router();

// POST /api/invitations/:token/accept -> Accept workspace team invitation
invitationsRouter.post("/:token/accept", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const token = req.params.token;
    const result = await acceptWorkspaceInvitation(userId, token);

    return res.json({
      success: true,
      message: "Successfully joined team workspace",
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to accept invitation";
    return res.status(400).json({ error: msg });
  }
});
