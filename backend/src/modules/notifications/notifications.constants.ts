/** Default page size when listing notifications. */
export const DEFAULT_NOTIFICATIONS_LIMIT = 10;

/** Maximum notifications returned in a single list request. */
export const MAX_NOTIFICATIONS_LIMIT = 50;

export const NOTIFICATION_FIELDS = {
  NOTIFICATION_ID: "notificationId",
  LIMIT: "limit",
  PINNED: "pinned",
} as const;

/** Socket.IO event name for new in-app notifications. */
export const NOTIFICATION_SOCKET_EVENT = "notification";
