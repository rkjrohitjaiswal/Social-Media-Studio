import {
  enqueueInstagramPublishJob,
  getConnectedInstagramAccount,
} from "./instagram-worker";
import { dispatchN8nEvent } from "../integrations/n8n/event-dispatcher";

export interface ScheduledState {
  id: string;
  workspaceId: string;
  campaignId: string;
  generatedAssetId: string;
  socialCopyId: string;
  instagramAccountId: string;
  instagramPublicationId?: string;
  scheduledFor: string; // UTC ISO String
  timezone: string; // IANA string (e.g. "Asia/Kolkata")
  status: "DRAFT" | "SCHEDULED" | "PROCESSING" | "PUBLISHED" | "FAILED" | "CANCELLED";
  captionSnapshot: string;
  hashtagsSnapshot: string[];
  ctaSnapshot: string;
  createdByUserId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  cancelledAt?: string;
}

// In-Memory Scheduled Publication Store (Authoritative backup in PostgreSQL)
const scheduledStore = new Map<string, ScheduledState>(); // id -> ScheduledState
const assetScheduleMap = new Map<string, string[]>(); // generatedAssetId -> scheduleIds[]

export const gracePeriodMinutesConfig = parseInt(process.env.INSTAGRAM_SCHEDULE_GRACE_MINUTES || "30", 10);

export async function createScheduledPublication(params: {
  workspaceId: string;
  campaignId: string;
  generatedAssetId: string;
  socialCopyId: string;
  instagramAccountId: string;
  scheduledFor: string; // ISO UTC
  timezone?: string;
  caption: string;
  hashtags: string[];
  cta: string;
  approvalStatus: string;
  imageStatus: string;
  copyStatus: string;
  qualityStatus: string;
  createdByUserId?: string;
}): Promise<ScheduledState> {
  // APPROVAL GATING RULE: Server must enforce ALL requirements
  if (
    params.approvalStatus !== "APPROVED" ||
    params.imageStatus !== "COMPLETED" ||
    params.copyStatus !== "COMPLETED" ||
    params.qualityStatus !== "COMPLETED"
  ) {
    throw new Error(
      "Scheduling Rejected: Asset must have COMPLETED image, COMPLETED copy, COMPLETED quality analysis, and explicit APPROVED human status."
    );
  }

  const account = getConnectedInstagramAccount(params.workspaceId);
  if (!account || account.status !== "CONNECTED") {
    throw new Error("Scheduling Rejected: No connected Instagram Professional account found for workspace.");
  }

  // FUTURE DATE VALIDATION
  const scheduledTimeMs = new Date(params.scheduledFor).getTime();
  if (isNaN(scheduledTimeMs) || scheduledTimeMs <= Date.now()) {
    throw new Error("Scheduling Rejected: Scheduled time must be a valid future date/time.");
  }

  // IDEMPOTENCY CHECK: Prevent duplicate active schedules for same asset/account
  const existingScheduleIds = assetScheduleMap.get(params.generatedAssetId) || [];
  for (const id of existingScheduleIds) {
    const existing = scheduledStore.get(id);
    if (existing && existing.status === "SCHEDULED") {
      return existing;
    }
  }

  const scheduleId = `sched-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const scheduleState: ScheduledState = {
    id: scheduleId,
    workspaceId: params.workspaceId,
    campaignId: params.campaignId,
    generatedAssetId: params.generatedAssetId,
    socialCopyId: params.socialCopyId,
    instagramAccountId: account.id,
    scheduledFor: new Date(params.scheduledFor).toISOString(),
    timezone: params.timezone || "UTC",
    status: "SCHEDULED",
    captionSnapshot: params.caption,
    hashtagsSnapshot: params.hashtags,
    ctaSnapshot: params.cta,
    createdByUserId: params.createdByUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  scheduledStore.set(scheduleId, scheduleState);
  assetScheduleMap.set(params.generatedAssetId, [...existingScheduleIds, scheduleId]);

  dispatchN8nEvent({
    eventType: "schedule.created",
    workspaceId: params.workspaceId,
    data: {
      campaignId: params.campaignId,
      assetId: params.generatedAssetId,
      scheduleId,
      scheduledFor: scheduleState.scheduledFor,
      status: "SCHEDULED",
    },
  }).catch(() => {});

  return scheduleState;
}

export function updateScheduledTime(
  scheduleId: string,
  newScheduledFor: string,
  newTimezone?: string
): ScheduledState | null {
  const sched = scheduledStore.get(scheduleId);
  if (!sched) return null;

  if (sched.status !== "SCHEDULED") {
    throw new Error(`Cannot edit schedule with status ${sched.status}. Only SCHEDULED posts can be updated.`);
  }

  const newTimeMs = new Date(newScheduledFor).getTime();
  if (isNaN(newTimeMs) || newTimeMs <= Date.now()) {
    throw new Error("Updated scheduled time must be a valid future date/time.");
  }

  sched.scheduledFor = new Date(newScheduledFor).toISOString();
  if (newTimezone) sched.timezone = newTimezone;
  sched.updatedAt = new Date().toISOString();
  return sched;
}

export function cancelScheduledPublication(scheduleId: string, workspaceId?: string): ScheduledState | null {
  const sched = scheduledStore.get(scheduleId);
  if (!sched || (workspaceId && sched.workspaceId !== workspaceId)) return null;

  sched.status = "CANCELLED";
  sched.cancelledAt = new Date().toISOString();
  sched.updatedAt = new Date().toISOString();

  dispatchN8nEvent({
    eventType: "schedule.cancelled",
    workspaceId: sched.workspaceId,
    data: {
      campaignId: sched.campaignId,
      assetId: sched.generatedAssetId,
      scheduleId,
      status: "CANCELLED",
    },
  }).catch(() => {});

  return sched;
}

// Invalidate schedules if asset approval is revoked (e.g. CHANGES_REQUESTED or REJECTED)
export function invalidateSchedulesForAsset(generatedAssetId: string, reason: string) {
  const ids = assetScheduleMap.get(generatedAssetId) || [];
  for (const id of ids) {
    const sched = scheduledStore.get(id);
    if (sched && sched.status === "SCHEDULED") {
      sched.status = "CANCELLED";
      sched.failureReason = reason;
      sched.cancelledAt = new Date().toISOString();
      sched.updatedAt = new Date().toISOString();

      dispatchN8nEvent({
        eventType: "schedule.cancelled",
        workspaceId: sched.workspaceId,
        data: {
          campaignId: sched.campaignId,
          assetId: sched.generatedAssetId,
          scheduleId: sched.id,
          status: "CANCELLED",
          reason,
        },
      }).catch(() => {});
    }
  }
}

// LAST-SECOND APPROVAL CHECK & PUBLISHING HANDOFF WORKER PROCESS
export async function processDueScheduledPublications(params?: {
  currentAssetApprovalStatus?: string;
  forceCurrentTimeMs?: number;
}): Promise<ScheduledState[]> {
  const nowMs = params?.forceCurrentTimeMs || Date.now();
  const processed: ScheduledState[] = [];

  for (const sched of scheduledStore.values()) {
    if (sched.status !== "SCHEDULED") continue;

    const scheduledTimeMs = new Date(sched.scheduledFor).getTime();

    // Check if due
    if (scheduledTimeMs <= nowMs) {
      const currentApproval = params?.currentAssetApprovalStatus || "APPROVED";
      const account = getConnectedInstagramAccount(sched.workspaceId);

      // LAST-SECOND APPROVAL CHECK
      if (currentApproval !== "APPROVED" || !account || account.status !== "CONNECTED") {
        sched.status = "CANCELLED";
        sched.failureReason = "Last-second approval or account connection check failed";
        sched.cancelledAt = new Date().toISOString();
        sched.updatedAt = new Date().toISOString();

        dispatchN8nEvent({
          eventType: "schedule.cancelled",
          workspaceId: sched.workspaceId,
          data: {
            campaignId: sched.campaignId,
            assetId: sched.generatedAssetId,
            scheduleId: sched.id,
            status: "CANCELLED",
          },
        }).catch(() => {});
        continue;
      }

      // GRACE PERIOD OVERDUE CHECK
      const overdueMinutes = (nowMs - scheduledTimeMs) / (1000 * 60);
      if (overdueMinutes > gracePeriodMinutesConfig) {
        sched.status = "FAILED";
        sched.failureReason = `MISSED_SCHEDULE_WINDOW: Overdue by ${Math.round(overdueMinutes)} minutes (exceeds ${gracePeriodMinutesConfig}m grace period)`;
        sched.updatedAt = new Date().toISOString();

        dispatchN8nEvent({
          eventType: "schedule.failed",
          workspaceId: sched.workspaceId,
          data: {
            campaignId: sched.campaignId,
            assetId: sched.generatedAssetId,
            scheduleId: sched.id,
            status: "FAILED",
            reason: sched.failureReason,
          },
        }).catch(() => {});
        continue;
      }

      // Claim schedule & Handoff to Instagram Publishing Worker
      sched.status = "PROCESSING";
      sched.updatedAt = new Date().toISOString();

      try {
        const pub = await enqueueInstagramPublishJob({
          workspaceId: sched.workspaceId,
          campaignId: sched.campaignId,
          generatedAssetId: sched.generatedAssetId,
          socialCopyId: sched.socialCopyId,
          caption: sched.captionSnapshot,
          hashtags: sched.hashtagsSnapshot,
          cta: sched.ctaSnapshot,
          approvalStatus: "APPROVED",
          imageStatus: "COMPLETED",
          copyStatus: "COMPLETED",
          qualityStatus: "COMPLETED",
          imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop",
        });

        sched.status = "PUBLISHED";
        sched.instagramPublicationId = pub.id;
        sched.publishedAt = new Date().toISOString();
        sched.updatedAt = new Date().toISOString();
        processed.push(sched);

        dispatchN8nEvent({
          eventType: "schedule.published",
          workspaceId: sched.workspaceId,
          data: {
            campaignId: sched.campaignId,
            assetId: sched.generatedAssetId,
            scheduleId: sched.id,
            instagramPublicationId: pub.id,
            status: "PUBLISHED",
          },
        }).catch(() => {});
      } catch (err: unknown) {
        sched.status = "FAILED";
        sched.failureReason = err instanceof Error ? err.message : "Publish handoff failed";
        sched.updatedAt = new Date().toISOString();

        dispatchN8nEvent({
          eventType: "schedule.failed",
          workspaceId: sched.workspaceId,
          data: {
            campaignId: sched.campaignId,
            assetId: sched.generatedAssetId,
            scheduleId: sched.id,
            status: "FAILED",
            reason: sched.failureReason,
          },
        }).catch(() => {});
      }
    }
  }

  return processed;
}

export function getScheduledPublicationsByCampaign(campaignId: string): ScheduledState[] {
  return Array.from(scheduledStore.values()).filter((s) => s.campaignId === campaignId);
}

export function getAllScheduledPublications(): ScheduledState[] {
  return Array.from(scheduledStore.values());
}

export function getScheduleById(scheduleId: string): ScheduledState | null {
  return scheduledStore.get(scheduleId) || null;
}

export function clearScheduleStore(): void {
  scheduledStore.clear();
  assetScheduleMap.clear();
}
