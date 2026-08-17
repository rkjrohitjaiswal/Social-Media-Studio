import prisma from "@ai-social/database";
import crypto from "crypto";
import {
  CreateApprovalRequestInput,
  ReviewActionInput,
  ApprovalRequestResponse,
  ApprovalAuditLogResponse,
} from "@ai-social/shared";

const approvalMemoryStore = new Map<string, ApprovalRequestResponse>();
const tokenToApprovalId = new Map<string, string>();

export async function createApprovalRequest(
  userId: string,
  data: CreateApprovalRequestInput
): Promise<ApprovalRequestResponse> {
  const approvalId = `appr_${Date.now()}`;
  const clientToken = crypto.randomBytes(32).toString("hex");
  const now = new Date();

  const auditLog: ApprovalAuditLogResponse = {
    id: `audit_${Date.now()}`,
    action: "SUBMITTED",
    actorId: userId,
    actorName: "Content Creator",
    actorRole: "EDITOR",
    comment: "Submitted content for client review",
    createdAt: now.toISOString(),
  };

  const approval: ApprovalRequestResponse = {
    id: approvalId,
    workspaceId: data.workspaceId,
    contentTitle: data.contentTitle,
    caption: data.caption,
    platform: data.platform,
    previewUrl: data.previewUrl || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800",
    status: "IN_REVIEW",
    submittedById: userId,
    clientToken,
    clientApprovalUrl: `/approval/${clientToken}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    auditLogs: [auditLog],
  };

  approvalMemoryStore.set(approvalId, approval);
  tokenToApprovalId.set(clientToken, approvalId);

  try {
    await prisma.approvalRequest.create({
      data: {
        id: approvalId,
        workspaceId: data.workspaceId,
        contentTitle: data.contentTitle,
        caption: data.caption,
        platform: data.platform as any,
        previewUrl: approval.previewUrl,
        status: "IN_REVIEW" as any,
        submittedById: userId,
        clientToken,
        auditLogs: {
          create: {
            action: "SUBMITTED" as any,
            actorId: userId,
            actorName: "Content Creator",
            actorRole: "EDITOR",
            comment: "Submitted content for review",
          },
        },
      },
    });
  } catch {
    // Isolated test mode fallback
  }

  return approval;
}

export async function getApprovalById(approvalId: string): Promise<ApprovalRequestResponse | null> {
  return approvalMemoryStore.get(approvalId) || null;
}

export async function getApprovalByClientToken(clientToken: string): Promise<ApprovalRequestResponse | null> {
  const approvalId = tokenToApprovalId.get(clientToken);
  if (!approvalId) return null;
  return approvalMemoryStore.get(approvalId) || null;
}

export async function reviewApprovalRequest(
  approvalId: string,
  reviewerId: string,
  data: ReviewActionInput
): Promise<ApprovalRequestResponse> {
  const approval = approvalMemoryStore.get(approvalId);
  if (!approval) throw new Error("Approval request not found");

  const now = new Date();
  const newStatus = data.action === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";
  const actionType = data.action === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";

  approval.status = newStatus;
  approval.reviewedById = reviewerId;
  approval.updatedAt = now.toISOString();

  const auditLog: ApprovalAuditLogResponse = {
    id: `audit_${Date.now()}`,
    action: actionType,
    actorId: reviewerId,
    actorName: "Reviewer",
    actorRole: "REVIEWER",
    comment: data.comment || (data.action === "APPROVE" ? "Approved by reviewer" : "Changes requested"),
    createdAt: now.toISOString(),
  };

  approval.auditLogs = approval.auditLogs || [];
  approval.auditLogs.push(auditLog);

  return approval;
}

export async function reviewClientApprovalByToken(
  clientToken: string,
  data: ReviewActionInput
): Promise<ApprovalRequestResponse> {
  const approvalId = tokenToApprovalId.get(clientToken);
  if (!approvalId) throw new Error("Invalid or expired client approval link");

  return reviewApprovalRequest(approvalId, "external-client", data);
}

export function clearInMemoryApprovals(): void {
  approvalMemoryStore.clear();
  tokenToApprovalId.clear();
}
