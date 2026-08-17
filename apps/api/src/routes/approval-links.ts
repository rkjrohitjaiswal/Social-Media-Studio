import { Router, Request, Response } from "express";
import {
  getApprovalByClientToken,
  reviewClientApprovalByToken,
} from "../services/approval-service.js";

export const approvalLinksRouter = Router();

// GET /api/approval-links/:token -> Public client preview portal (No authentication required)
approvalLinksRouter.get("/:token", async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const approval = await getApprovalByClientToken(token);

    if (!approval) {
      return res.status(404).json({ error: "Approval link not found or has expired" });
    }

    // Public view payload (Zero secrets, zero passwords, zero API keys)
    return res.json({
      success: true,
      data: {
        id: approval.id,
        contentTitle: approval.contentTitle,
        caption: approval.caption,
        platform: approval.platform,
        previewUrl: approval.previewUrl,
        status: approval.status,
        createdAt: approval.createdAt,
        auditLogs: approval.auditLogs,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load client approval portal";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/approval-links/:token/approve -> Public client approval action
approvalLinksRouter.post("/:token/approve", async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const comment = req.body?.comment || "Approved by client";

    const updated = await reviewClientApprovalByToken(token, { action: "APPROVE", comment });
    return res.json({
      success: true,
      message: "Content approved successfully!",
      data: {
        status: updated.status,
        auditLogs: updated.auditLogs,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process client approval";
    return res.status(400).json({ error: msg });
  }
});

// POST /api/approval-links/:token/request-changes -> Public client request changes action
approvalLinksRouter.post("/:token/request-changes", async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const comment = req.body?.comment;

    if (!comment) {
      return res.status(400).json({ error: "A comment is required when requesting changes." });
    }

    const updated = await reviewClientApprovalByToken(token, { action: "REQUEST_CHANGES", comment });
    return res.json({
      success: true,
      message: "Changes requested successfully. The creator has been notified.",
      data: {
        status: updated.status,
        auditLogs: updated.auditLogs,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit change request";
    return res.status(400).json({ error: msg });
  }
});
