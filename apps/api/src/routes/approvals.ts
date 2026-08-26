import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import {
  createApprovalRequest,
  reviewApprovalRequest,
  getApprovalById,
  listApprovalRequests,
} from "../services/approval-service.js";
import { createApprovalRequestSchema, reviewActionSchema } from "@ai-social/shared";
import { canUseFeature } from "../services/entitlement-service.js";

export const approvalsRouter = Router();

// GET /api/approvals -> Fetch approval requests for active workspace
approvalsRouter.get("/", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId || "demo-workspace-1";
    const approvals = await listApprovalRequests(workspaceId);
    return res.json({ success: true, data: approvals });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch approvals";
    return res.status(500).json({ error: msg });
  }
});

// GET /api/workspaces/:id/approvals -> Fetch approval requests for workspace
approvalsRouter.get("/:id/approvals", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.id;
    const approvals = await listApprovalRequests(workspaceId);
    return res.json({ success: true, data: approvals });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch approvals";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/workspaces/:id/approvals -> Create content approval request
approvalsRouter.post("/:id/approvals", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.params.id;

    // Check Business feature permission
    const perm = await canUseFeature(userId, "TEAM_WORKSPACES");
    if (!perm.allowed) {
      return res.status(403).json({ error: "Client approval workflows are available on the Business plan.", code: "FEATURE_NOT_AVAILABLE" });
    }

    const parse = createApprovalRequestSchema.safeParse({ ...req.body, workspaceId });
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid approval request payload" });
    }

    const approval = await createApprovalRequest(userId, parse.data);
    return res.json({
      success: true,
      data: approval,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create approval request";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/approvals/:id/approve -> Internal reviewer approves content
approvalsRouter.post("/:id/approve", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const approvalId = req.params.id;
    const comment = req.body?.comment;

    const updated = await reviewApprovalRequest(approvalId, userId, { action: "APPROVE", comment });
    return res.json({
      success: true,
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve content";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/approvals/:id/request-changes -> Internal reviewer requests changes
approvalsRouter.post("/:id/request-changes", requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const approvalId = req.params.id;
    const comment = req.body?.comment;

    const updated = await reviewApprovalRequest(approvalId, userId, { action: "REQUEST_CHANGES", comment });
    return res.json({
      success: true,
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to request changes";
    return res.status(500).json({ error: msg });
  }
});
