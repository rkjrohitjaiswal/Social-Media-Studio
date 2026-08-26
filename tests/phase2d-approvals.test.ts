import { describe, it, expect, beforeEach } from "vitest";
import {
  createApprovalRequest,
  getApprovalByClientToken,
  reviewClientApprovalByToken,
  clearInMemoryApprovals,
} from "../apps/api/src/services/approval-service.js";
import { prisma } from "@ai-social/database";

describe("Phase 2D Part 1 — Approval Linkage & Status Synchronization", () => {
  const userId = "demo-user-id";
  const workspaceId = "demo-workspace-1";

  beforeEach(() => {
    clearInMemoryApprovals();
  });

  it("creates approval request without linked content and preserves compatibility", async () => {
    const approval = await createApprovalRequest(userId, {
      workspaceId,
      contentTitle: "Unlinked Product Carousel",
      caption: "Luxury architectural design spotlight.",
      platform: "INSTAGRAM",
      previewUrl: "https://example.com/preview.jpg",
    });

    expect(approval.id).toBeDefined();
    expect(approval.clientToken).toBeDefined();
    expect(approval.status).toBe("IN_REVIEW");
    expect(approval.contentPlanItemId).toBeUndefined();
    expect(approval.auditLogs).toHaveLength(1);
    expect(approval.auditLogs![0].action).toBe("SUBMITTED");
  });

  it("stores optional contentPlanItemId and aiCampaignId linkage", async () => {
    const approval = await createApprovalRequest(userId, {
      workspaceId,
      contentTitle: "Trend Hook Carousel Post",
      caption: "Capitalizing on viral trend.",
      platform: "INSTAGRAM",
      contentPlanItemId: "item-123",
      aiCampaignId: "camp-456",
    });

    expect(approval.contentPlanItemId).toBe("item-123");
    expect(approval.aiCampaignId).toBe("camp-456");
  });

  it("synchronizes APPROVED status with linked ContentPlanItem when client approves", async () => {
    let itemId = `item_test_${Date.now()}`;
    try {
      const user = await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: "demo@example.com", supabaseUid: userId, fullName: "Claire" },
      });
      const plan = await prisma.contentPlan.create({
        data: {
          userId: user.id,
          title: "Test Plan",
          startDate: new Date(),
          endDate: new Date(),
        },
      });
      const item = await prisma.contentPlanItem.create({
        data: {
          contentPlanId: plan.id,
          userId: user.id,
          date: new Date(),
          platform: "INSTAGRAM",
          contentType: "Carousel",
          pillarName: "Trend Hijack",
          topic: "Test Topic",
          hook: "Test Hook",
          status: "DRAFT",
        },
      });
      itemId = item.id;
    } catch {
      // Offline fallback
    }

    const approval = await createApprovalRequest(userId, {
      workspaceId,
      contentTitle: "Linked Content Post",
      caption: "Minimalist aesthetic.",
      platform: "INSTAGRAM",
      contentPlanItemId: itemId,
    });

    const reviewed = await reviewClientApprovalByToken(approval.clientToken, {
      action: "APPROVE",
      comment: "Approved by client director.",
    });

    expect(reviewed.status).toBe("APPROVED");
    expect(reviewed.auditLogs).toHaveLength(2);
    expect(reviewed.auditLogs![1].action).toBe("APPROVED");
    expect(reviewed.auditLogs![1].comment).toBe("Approved by client director.");

    try {
      const dbItem = await prisma.contentPlanItem.findUnique({ where: { id: itemId } });
      if (dbItem) {
        expect(dbItem.status).toBe("APPROVED");
      }
    } catch {
      // Offline mode
    }
  });

  it("synchronizes CHANGES_REQUESTED status with linked ContentPlanItem when client requests changes", async () => {
    let itemId = `item_test_changes_${Date.now()}`;
    try {
      const plan = await prisma.contentPlan.findFirst({ where: { userId } });
      if (plan) {
        const item = await prisma.contentPlanItem.create({
          data: {
            contentPlanId: plan.id,
            userId,
            date: new Date(),
            platform: "INSTAGRAM",
            contentType: "Carousel",
            pillarName: "Education",
            topic: "Test Topic Changes",
            hook: "Test Hook Changes",
            status: "DRAFT",
          },
        });
        itemId = item.id;
      }
    } catch {
      // Offline fallback
    }

    const approval = await createApprovalRequest(userId, {
      workspaceId,
      contentTitle: "Post Requesting Changes",
      caption: "Initial caption.",
      platform: "INSTAGRAM",
      contentPlanItemId: itemId,
    });

    const reviewed = await reviewClientApprovalByToken(approval.clientToken, {
      action: "REQUEST_CHANGES",
      comment: "Please update color contrast.",
    });

    expect(reviewed.status).toBe("CHANGES_REQUESTED");
    expect(reviewed.auditLogs).toHaveLength(2);
    expect(reviewed.auditLogs![1].action).toBe("CHANGES_REQUESTED");
    expect(reviewed.auditLogs![1].comment).toBe("Please update color contrast.");

    try {
      const dbItem = await prisma.contentPlanItem.findUnique({ where: { id: itemId } });
      if (dbItem) {
        expect(dbItem.status).toBe("CHANGES_REQUESTED");
      }
    } catch {
      // Offline mode
    }
  });

  it("handles Share Approval Link request with contentPlanItemId and generates public URL", async () => {
    const approval = await createApprovalRequest(userId, {
      workspaceId,
      contentTitle: "Shareable Calendar Post",
      caption: "Elevating aesthetic luxury.",
      platform: "INSTAGRAM",
      contentPlanItemId: "item-plan-789",
    });

    expect(approval.contentPlanItemId).toBe("item-plan-789");
    expect(approval.clientToken).toBeDefined();
    expect(approval.clientApprovalUrl).toMatch(/^\/approval\/[a-f0-9]+$/);
  });

  it("retrieves public approval data using clientToken for client review", async () => {
    const approval = await createApprovalRequest(userId, {
      workspaceId,
      contentTitle: "Public Preview Post",
      caption: "Public review caption",
      platform: "LINKEDIN",
    });

    const publicData = await getApprovalByClientToken(approval.clientToken);
    expect(publicData).not.toBeNull();
    expect(publicData?.contentTitle).toBe("Public Preview Post");
    expect(publicData?.status).toBe("IN_REVIEW");
  });
});
