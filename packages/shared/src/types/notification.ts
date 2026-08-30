// Shared Notification Types
// Used by both the API server and the Next.js web client.

/** All possible notification event types. */
export type NotificationType =
  | "GENERATION_COMPLETED"
  | "GENERATION_FAILED"
  | "PUBLISH_SUCCESS"
  | "PUBLISH_FAILED"
  | "QUALITY_ALERT"
  | "APPROVAL_REQUEST"
  | "SYSTEM";

/** Icon/colour hint for each notification type rendered in the frontend. */
export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  { label: string; color: string }
> = {
  GENERATION_COMPLETED: { label: "Generation", color: "#22c55e" },
  GENERATION_FAILED:    { label: "Generation", color: "#ef4444" },
  PUBLISH_SUCCESS:      { label: "Published",  color: "#3b82f6" },
  PUBLISH_FAILED:       { label: "Publish",    color: "#ef4444" },
  QUALITY_ALERT:        { label: "Quality",    color: "#f59e0b" },
  APPROVAL_REQUEST:     { label: "Approval",   color: "#8b5cf6" },
  SYSTEM:               { label: "System",     color: "#9E9D98" },
};

/** The shape returned from GET /api/notifications. */
export interface NotificationItem {
  id: string;
  userId: string;
  workspaceId: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  read: boolean;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload accepted by the server-side createNotification() helper. */
export interface CreateNotificationParams {
  userId: string;
  workspaceId?: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/** Response shape of GET /api/notifications. */
export interface GetNotificationsResponse {
  notifications: NotificationItem[];
}

/** Response shape of GET /api/notifications/unread-count. */
export interface UnreadCountResponse {
  unreadCount: number;
}
