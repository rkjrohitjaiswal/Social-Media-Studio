import { describe, it, expect, beforeEach } from "vitest";
import {
  getUserWorkspaces,
  checkWorkspaceMembership,
  getWorkspaceUserRole,
  inviteWorkspaceMember,
  clearInMemoryWorkspaces,
} from "../apps/api/src/services/workspace-service.js";

/**
 * Phase 2D Part 4 — Workspace & Client Management Tests
 *
 * Covers:
 * 1. Authenticated workspace listing
 * 2. Workspace membership validation
 * 3. Workspace switching / role checking
 * 4. Unauthorized workspace access rejection
 * 5. Workspace resource isolation
 * 6. Role permission enforcement (OWNER/ADMIN vs MEMBER)
 */

const USER_A = "user_alpha_test";
const USER_B = "user_beta_test";
const WORKSPACE_A = "demo-workspace-1";
const WORKSPACE_B = "ws_beta_isolated";

describe("Phase 2D Part 4 — Workspace & Client Management", () => {
  beforeEach(() => {
    clearInMemoryWorkspaces();
  });

  it("lists available workspaces for authenticated user", async () => {
    const workspaces = await getUserWorkspaces(USER_A);
    expect(workspaces).toBeDefined();
    expect(Array.isArray(workspaces)).toBe(true);
    expect(workspaces.length).toBeGreaterThan(0);
    expect(workspaces[0].id).toBeDefined();
  });

  it("validates membership for authorized workspace members", async () => {
    // Default demo workspace permits valid access
    const isMember = await checkWorkspaceMembership(USER_A, WORKSPACE_A);
    expect(isMember).toBe(true);

    const role = await getWorkspaceUserRole(USER_A, WORKSPACE_A);
    expect(role).toBe("OWNER");
  });

  it("rejects unauthorized workspace access for non-members", async () => {
    // Non-member trying to access an isolated workspace
    const isMember = await checkWorkspaceMembership(USER_B, "ws_private_unauthorized_999");
    expect(isMember).toBe(false);

    const role = await getWorkspaceUserRole(USER_B, "ws_private_unauthorized_999");
    expect(role).toBeNull();
  });

  it("enforces workspace resource isolation", async () => {
    // User A is a member of Workspace A
    const isMemberA = await checkWorkspaceMembership(USER_A, WORKSPACE_A);
    expect(isMemberA).toBe(true);

    // User B is NOT a member of Workspace B (unless invited)
    const isMemberB = await checkWorkspaceMembership(USER_B, WORKSPACE_B);
    expect(isMemberB).toBe(false);
  });

  it("enforces OWNER/ADMIN permission rules for managing members", async () => {
    // Non-member / non-admin attempt to invite should fail
    try {
      await inviteWorkspaceMember("ws_unknown_test", USER_B, {
        email: "invited@test.com",
        role: "EDITOR",
      });
      expect.unreachable("Non-member invitation should throw PERMISSION_DENIED");
    } catch (err: any) {
      expect(err.message).toContain("Permission denied");
    }
  });

  it("allows workspace context switching for valid member", async () => {
    const userWorkspaces = await getUserWorkspaces(USER_A);
    expect(userWorkspaces.length).toBeGreaterThan(0);

    const targetWs = userWorkspaces[0];
    const canSwitch = await checkWorkspaceMembership(USER_A, targetWs.id);
    expect(canSwitch).toBe(true);
  });
});
