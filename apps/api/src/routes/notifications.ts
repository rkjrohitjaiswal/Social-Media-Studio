import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../services/notification-service.js";
import type { GetNotificationsResponse, UnreadCountResponse } from "@ai-social/shared";

export const notificationsRouter = Router();

// All notification routes require the user to be authenticated.
// The userId is always taken from req.user (set by requireAuth) — never from the
// request body or query string. This ensures users can only access their own data.
notificationsRouter.use(requireAuth);

/**
 * GET /api/notifications
 * Returns the authenticated user's 20 most recent notifications (newest first).
 * Optional query param: ?limit=N  (max 100)
 */
notificationsRouter.get("/", async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const limit  = Math.min(parseInt((req.query.limit as string) || "20", 10), 100);

  const notifications = await getUserNotifications(userId, limit);
  const body: GetNotificationsResponse = { notifications };
  return res.json(body);
});

/**
 * GET /api/notifications/unread-count
 * Returns { unreadCount: number } for the authenticated user.
 */
notificationsRouter.get("/unread-count", async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const unreadCount = await getUnreadCount(userId);
  const body: UnreadCountResponse = { unreadCount };
  return res.json(body);
});

/**
 * PATCH /api/notifications/mark-all-read
 * POST  /api/notifications/mark-all-read  (alias for frontend convenience)
 * Marks every unread notification for the authenticated user as read.
 */
async function handleMarkAllRead(req: AuthenticatedRequest, res: any) {
  const userId = req.user!.id;
  await markAllAsRead(userId);
  return res.json({ success: true });
}
notificationsRouter.patch("/mark-all-read", handleMarkAllRead);
notificationsRouter.post("/mark-all-read", handleMarkAllRead);

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 * Returns 404 if the notification doesn't exist or belongs to another user.
 */
notificationsRouter.patch("/:id/read", async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const success = await markAsRead(userId, id);
  if (!success) {
    return res.status(404).json({ error: "Notification not found" });
  }
  return res.json({ success: true });
});

/**
 * DELETE /api/notifications/:id
 * Dismisses/deletes a single notification (only if it belongs to the user).
 */
notificationsRouter.delete("/:id", async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const success = await deleteNotification(userId, id);
  if (!success) {
    return res.status(404).json({ error: "Notification not found" });
  }
  return res.json({ success: true });
});
