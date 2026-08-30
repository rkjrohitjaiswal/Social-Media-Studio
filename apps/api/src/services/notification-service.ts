import { prisma } from "@ai-social/database";
import type { CreateNotificationParams, NotificationItem } from "@ai-social/shared";

export type { CreateNotificationParams, NotificationItem };

/**
 * Creates a notification record for a specific user.
 * Fire-and-forget safe — all errors are swallowed so callers never fail.
 * Never accepts input from the browser as the source of truth.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId:      params.userId,
        workspaceId: params.workspaceId ?? null,
        type:        params.type as any,
        title:       params.title,
        message:     params.message   ?? null,
        entityType:  params.entityType ?? null,
        entityId:    params.entityId  ?? null,
        actionUrl:   params.actionUrl ?? null,
        metadataJson: params.metadata ?? null,
      },
    });
  } catch (err) {
    // Non-fatal — notification creation must never crash application flows
    console.warn("[NotificationService] Failed to create notification:", err);
  }
}

/**
 * Fetches the most recent notifications for a user, newest first.
 * Default limit is 20 as per performance requirement.
 */
export async function getUserNotifications(userId: string, limit = 20): Promise<NotificationItem[]> {
  try {
    const rows = await prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    limit,
    });
    // Serialise DateTime -> ISO string so the response is JSON-safe
    return rows.map((r: {
      id: string;
      userId: string;
      workspaceId: string | null;
      type: string;
      title: string;
      message: string | null;
      read: boolean;
      readAt: Date | null;
      entityType: string | null;
      entityId: string | null;
      actionUrl: string | null;
      metadataJson: unknown;
      createdAt: Date;
      updatedAt: Date;
    }) => ({
      id:          r.id,
      userId:      r.userId,
      workspaceId: r.workspaceId ?? null,
      type:        r.type as any,
      title:       r.title,
      message:     r.message    ?? null,
      read:        r.read,
      readAt:      r.readAt     ? r.readAt.toISOString()    : null,
      entityType:  r.entityType ?? null,
      entityId:    r.entityId   ?? null,
      actionUrl:   r.actionUrl  ?? null,
      metadataJson: r.metadataJson as Record<string, unknown> | null,
      createdAt:   r.createdAt.toISOString(),
      updatedAt:   r.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

/** Count unread notifications for a user. */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: { userId, read: false },
    });
  } catch {
    return 0;
  }
}

/** Mark a single notification as read. Returns true if the row was updated. */
export async function markAsRead(userId: string, notificationId: string): Promise<boolean> {
  try {
    const updated = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data:  { read: true, readAt: new Date() },
    });
    return updated.count > 0;
  } catch {
    return false;
  }
}

/** Mark all unread notifications for a user as read. */
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data:  { read: true, readAt: new Date() },
    });
  } catch (err) {
    console.warn("[NotificationService] markAllAsRead failed:", err);
  }
}

/** Dismiss (delete) a single notification belonging to the user. */
export async function deleteNotification(userId: string, notificationId: string): Promise<boolean> {
  try {
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return result.count > 0;
  } catch {
    return false;
  }
}
