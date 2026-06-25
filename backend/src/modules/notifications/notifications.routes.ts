import { Router } from "express";
import { NotificationsController } from "./notifications.controller";
import { NotificationPreferencesController } from "./notification-preferences.controller";

const notificationsController = new NotificationsController();
const notificationPreferencesController = new NotificationPreferencesController();

export const notificationsRouter = Router();

/** List the authenticated user's in-app notifications. */
notificationsRouter.get("/", notificationsController.getMyNotifications);

/**
 * Read / update the authenticated user's notification preferences. Declared before the
 * `/:notificationId` param routes so the literal path is matched first.
 */
notificationsRouter.get(
  "/preferences",
  notificationPreferencesController.getMyPreferences,
);
notificationsRouter.patch(
  "/preferences",
  notificationPreferencesController.updateMyPreferences,
);

/** Mark every unread notification as read. Declared before the param routes. */
notificationsRouter.patch("/read-all", notificationsController.markAllAsRead);

/** Mark one notification as read. */
notificationsRouter.patch(
  "/:notificationId/read",
  notificationsController.markAsRead,
);

/** Pin or unpin one notification. */
notificationsRouter.patch(
  "/:notificationId/pin",
  notificationsController.setPin,
);

/** Clear (soft-delete) one notification. */
notificationsRouter.delete(
  "/:notificationId",
  notificationsController.clearOne,
);

/** Clear (soft-delete) all notifications except pinned ones. */
notificationsRouter.delete("/", notificationsController.clearAll);
