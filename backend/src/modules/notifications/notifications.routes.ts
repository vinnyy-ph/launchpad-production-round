import { Router } from "express";
import { NotificationsController } from "./notifications.controller";

const notificationsController = new NotificationsController();

export const notificationsRouter = Router();

/** List the authenticated user's in-app notifications. */
notificationsRouter.get("/", notificationsController.getMyNotifications);

/** Mark one notification as read. */
notificationsRouter.patch(
  "/:notificationId/read",
  notificationsController.markAsRead,
);
