import type {
  ListNotificationsQueryDto,
  MarkAsReadParamsDto,
  SetPinBodyDto,
} from "./dto";
import {
  DEFAULT_NOTIFICATIONS_LIMIT,
  MAX_NOTIFICATIONS_LIMIT,
  NOTIFICATION_FIELDS,
} from "./notifications.constants";

/**
 * Parses and validates notifications HTTP inputs.
 */
export class NotificationsValidation {
  /** Parses optional limit query for listing notifications. */
  parseListQuery(query: Record<string, unknown>): ListNotificationsQueryDto {
    const rawLimit = query[NOTIFICATION_FIELDS.LIMIT];

    if (rawLimit === undefined || rawLimit === "") {
      return { limit: DEFAULT_NOTIFICATIONS_LIMIT };
    }

    const limit = Number(rawLimit);

    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("Invalid limit");
    }

    return { limit: Math.min(limit, MAX_NOTIFICATIONS_LIMIT) };
  }

  /** Parses the notificationId route param (read / pin / clear). */
  parseNotificationIdParams(params: Record<string, unknown>): MarkAsReadParamsDto {
    const notificationId = params[NOTIFICATION_FIELDS.NOTIFICATION_ID];

    if (typeof notificationId !== "string" || !notificationId.trim()) {
      throw new Error(`${NOTIFICATION_FIELDS.NOTIFICATION_ID} is required`);
    }

    return { notificationId: notificationId.trim() };
  }

  /** Parses the pin toggle body `{ pinned: boolean }`. */
  parsePinBody(body: Record<string, unknown>): SetPinBodyDto {
    const pinned = body?.[NOTIFICATION_FIELDS.PINNED];

    if (typeof pinned !== "boolean") {
      throw new Error(`${NOTIFICATION_FIELDS.PINNED} is required`);
    }

    return { pinned };
  }
}
