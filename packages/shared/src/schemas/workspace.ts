import { z } from "zod";

export const workspaceRoleSchema = z.enum(["OWNER", "ADMIN", "EDITOR", "REVIEWER", "VIEWER"]);
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters"),
  slug: z.string().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: workspaceRoleSchema.default("EDITOR"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export interface WorkspaceMemberResponse {
  id: string;
  userId: string;
  email: string;
  fullName?: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceInvitationResponse {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: string;
  members: WorkspaceMemberResponse[];
  invitations?: WorkspaceInvitationResponse[];
  createdAt: string;
}
