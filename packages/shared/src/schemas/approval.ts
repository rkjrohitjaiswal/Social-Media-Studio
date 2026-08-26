import { z } from "zod";

export const approvalWorkflowStatusSchema = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
]);

export type ApprovalWorkflowStatus = z.infer<typeof approvalWorkflowStatusSchema>;

export const createApprovalRequestSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  contentTitle: z.string().min(1, "Content title is required"),
  caption: z.string().min(1, "Caption is required"),
  platform: z.string().default("INSTAGRAM"),
  previewUrl: z.string().optional(),
  contentPlanItemId: z.string().optional(),
  aiCampaignId: z.string().optional(),
});

export type CreateApprovalRequestInput = z.infer<typeof createApprovalRequestSchema>;

export const reviewActionSchema = z.object({
  action: z.enum(["APPROVE", "REQUEST_CHANGES"]),
  comment: z.string().optional(),
});

export type ReviewActionInput = z.infer<typeof reviewActionSchema>;

export interface ApprovalAuditLogResponse {
  id: string;
  action: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  comment?: string;
  createdAt: string;
}

export interface ApprovalRequestResponse {
  id: string;
  workspaceId: string;
  contentTitle: string;
  caption: string;
  platform: string;
  previewUrl?: string;
  status: ApprovalWorkflowStatus;
  submittedById: string;
  reviewedById?: string;
  clientToken: string;
  clientApprovalUrl: string;
  contentPlanItemId?: string;
  aiCampaignId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  auditLogs?: ApprovalAuditLogResponse[];
}
