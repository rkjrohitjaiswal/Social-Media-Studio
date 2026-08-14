import { describe, it, expect, vi } from "vitest";
import {
  createScheduledPublication,
  updateScheduledTime,
  cancelScheduledPublication,
  invalidateSchedulesForAsset,
  processDueScheduledPublications,
  getScheduleById,
} from "../apps/api/src/workers/instagram-scheduler-worker.js";
import { connectInstagramAccount } from "../apps/api/src/workers/instagram-worker.js";

// Mock Supabase Server Client
vi.mock("../lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-test-sched", email: "director@maisonlumiere.com" } },
        error: null,
      })),
    },
  })),
}));

describe("Content Calendar & Scheduling Approval Gating", () => {
  it("should reject scheduling if asset is not APPROVED by human reviewer", async () => {
    connectInstagramAccount({
      workspaceId: "ws-sched-1",
      instagramUserId: "ig-user-sched-1",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-sched-1",
    });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await expect(
      createScheduledPublication({
        workspaceId: "ws-sched-1",
        campaignId: "camp-sched-1",
        generatedAssetId: "gen-unapproved-sched",
        socialCopyId: "copy-sched-1",
        instagramAccountId: "acc-1",
        scheduledFor: tomorrow,
        timezone: "Asia/Kolkata",
        caption: "Test Caption",
        hashtags: ["test"],
        cta: "CTA",
        approvalStatus: "PENDING", // NOT APPROVED!
        imageStatus: "COMPLETED",
        copyStatus: "COMPLETED",
        qualityStatus: "COMPLETED",
      })
    ).rejects.toThrow("Scheduling Rejected");
  });

  it("should reject scheduling if scheduled date is in the past", async () => {
    connectInstagramAccount({
      workspaceId: "ws-sched-2",
      instagramUserId: "ig-user-sched-2",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-sched-2",
    });

    const pastDate = new Date(Date.now() - 10000).toISOString();

    await expect(
      createScheduledPublication({
        workspaceId: "ws-sched-2",
        campaignId: "camp-sched-2",
        generatedAssetId: "gen-past-sched",
        socialCopyId: "copy-sched-2",
        instagramAccountId: "acc-2",
        scheduledFor: pastDate, // PAST DATE!
        timezone: "Asia/Kolkata",
        caption: "Test Caption",
        hashtags: ["test"],
        cta: "CTA",
        approvalStatus: "APPROVED",
        imageStatus: "COMPLETED",
        copyStatus: "COMPLETED",
        qualityStatus: "COMPLETED",
      })
    ).rejects.toThrow("Scheduling Rejected");
  });
});

describe("Schedule Creation & Immutable Content Snapshot", () => {
  it("should create ScheduledPublication with immutable caption snapshot", async () => {
    connectInstagramAccount({
      workspaceId: "ws-sched-3",
      instagramUserId: "ig-user-sched-3",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-sched-3",
    });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const schedule = await createScheduledPublication({
      workspaceId: "ws-sched-3",
      campaignId: "camp-sched-3",
      generatedAssetId: "gen-snap-1",
      socialCopyId: "copy-snap-1",
      instagramAccountId: "acc-3",
      scheduledFor: tomorrow,
      timezone: "America/New_York",
      caption: "Approved Mediterranean Silk Dress Caption.",
      hashtags: ["resort", "haute"],
      cta: "Discover the story.",
      approvalStatus: "APPROVED",
      imageStatus: "COMPLETED",
      copyStatus: "COMPLETED",
      qualityStatus: "COMPLETED",
    });

    expect(schedule.status).toBe("SCHEDULED");
    expect(schedule.captionSnapshot).toBe("Approved Mediterranean Silk Dress Caption.");
    expect(schedule.hashtagsSnapshot).toEqual(["resort", "haute"]);
    expect(schedule.timezone).toBe("America/New_York");
  });
});

describe("Schedule Editing, Cancellation & Invalidation", () => {
  it("should update scheduled date/time when status is SCHEDULED", async () => {
    connectInstagramAccount({
      workspaceId: "ws-sched-4",
      instagramUserId: "ig-user-sched-4",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-sched-4",
    });

    const initialDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const newDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const schedule = await createScheduledPublication({
      workspaceId: "ws-sched-4",
      campaignId: "camp-sched-4",
      generatedAssetId: "gen-edit-sched-1",
      socialCopyId: "copy-edit-1",
      instagramAccountId: "acc-4",
      scheduledFor: initialDate,
      timezone: "UTC",
      caption: "Caption",
      hashtags: ["tag"],
      cta: "CTA",
      approvalStatus: "APPROVED",
      imageStatus: "COMPLETED",
      copyStatus: "COMPLETED",
      qualityStatus: "COMPLETED",
    });

    const updated = updateScheduledTime(schedule.id, newDate, "Europe/London");
    expect(updated?.scheduledFor).toBe(new Date(newDate).toISOString());
    expect(updated?.timezone).toBe("Europe/London");
  });

  it("should cancel schedule and update status to CANCELLED", async () => {
    connectInstagramAccount({
      workspaceId: "ws-sched-5",
      instagramUserId: "ig-user-sched-5",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-sched-5",
    });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const schedule = await createScheduledPublication({
      workspaceId: "ws-sched-5",
      campaignId: "camp-sched-5",
      generatedAssetId: "gen-cancel-sched-1",
      socialCopyId: "copy-cancel-1",
      instagramAccountId: "acc-5",
      scheduledFor: tomorrow,
      timezone: "UTC",
      caption: "Caption",
      hashtags: ["tag"],
      cta: "CTA",
      approvalStatus: "APPROVED",
      imageStatus: "COMPLETED",
      copyStatus: "COMPLETED",
      qualityStatus: "COMPLETED",
    });

    const cancelled = cancelScheduledPublication(schedule.id);
    expect(cancelled?.status).toBe("CANCELLED");
  });

  it("should invalidate schedule when asset approval is revoked", async () => {
    connectInstagramAccount({
      workspaceId: "ws-sched-6",
      instagramUserId: "ig-user-sched-6",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-sched-6",
    });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const schedule = await createScheduledPublication({
      workspaceId: "ws-sched-6",
      campaignId: "camp-sched-6",
      generatedAssetId: "gen-revoke-sched-1",
      socialCopyId: "copy-revoke-1",
      instagramAccountId: "acc-6",
      scheduledFor: tomorrow,
      timezone: "UTC",
      caption: "Caption",
      hashtags: ["tag"],
      cta: "CTA",
      approvalStatus: "APPROVED",
      imageStatus: "COMPLETED",
      copyStatus: "COMPLETED",
      qualityStatus: "COMPLETED",
    });

    invalidateSchedulesForAsset("gen-revoke-sched-1", "Approval revoked by revision request");

    const fetched = getScheduleById(schedule.id);
    expect(fetched?.status).toBe("CANCELLED");
    expect(fetched?.failureReason).toContain("revoked");
  });
});

describe("Last-Second Approval Check & Overdue Grace Period Worker", () => {
  it("should perform last-second approval check and execute publishing handoff when due", async () => {
    connectInstagramAccount({
      workspaceId: "ws-sched-7",
      instagramUserId: "ig-user-sched-7",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-sched-7",
    });

    const dueTime = new Date(Date.now() + 1000).toISOString();

    const schedule = await createScheduledPublication({
      workspaceId: "ws-sched-7",
      campaignId: "camp-sched-7",
      generatedAssetId: "gen-due-sched-1",
      socialCopyId: "copy-due-1",
      instagramAccountId: "acc-7",
      scheduledFor: dueTime,
      timezone: "UTC",
      caption: "Due Caption",
      hashtags: ["due"],
      cta: "CTA",
      approvalStatus: "APPROVED",
      imageStatus: "COMPLETED",
      copyStatus: "COMPLETED",
      qualityStatus: "COMPLETED",
    });

    // Execute scheduler worker simulation at forceCurrentTimeMs = dueTime + 2000
    const processed = await processDueScheduledPublications({
      currentAssetApprovalStatus: "APPROVED",
      forceCurrentTimeMs: new Date(dueTime).getTime() + 2000,
    });

    expect(processed.length).toBeGreaterThan(0);
    const updated = getScheduleById(schedule.id);
    expect(updated?.status).toBe("PUBLISHED");
    expect(updated?.instagramPublicationId).toBeTruthy();
  });

  it("should mark overdue schedules older than 30m grace period as FAILED", async () => {
    connectInstagramAccount({
      workspaceId: "ws-sched-8",
      instagramUserId: "ig-user-sched-8",
      username: "maisonlumiere_official",
      rawAccessToken: "mock-token-sched-8",
    });

    const pastTime = new Date(Date.now() + 1000).toISOString();

    const schedule = await createScheduledPublication({
      workspaceId: "ws-sched-8",
      campaignId: "camp-sched-8",
      generatedAssetId: "gen-overdue-sched-1",
      socialCopyId: "copy-overdue-1",
      instagramAccountId: "acc-8",
      scheduledFor: pastTime,
      timezone: "UTC",
      caption: "Overdue Caption",
      hashtags: ["overdue"],
      cta: "CTA",
      approvalStatus: "APPROVED",
      imageStatus: "COMPLETED",
      copyStatus: "COMPLETED",
      qualityStatus: "COMPLETED",
    });

    // Force current time to be 45 minutes past scheduledFor (> 30m grace period)
    await processDueScheduledPublications({
      currentAssetApprovalStatus: "APPROVED",
      forceCurrentTimeMs: new Date(pastTime).getTime() + 45 * 60 * 1000,
    });

    const updated = getScheduleById(schedule.id);
    expect(updated?.status).toBe("FAILED");
    expect(updated?.failureReason).toContain("MISSED_SCHEDULE_WINDOW");
  });
});
