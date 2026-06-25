import type { NotificationResponseDto } from "./notification-response.dto";

/** Response envelope returning a single updated notification (e.g. pin / unpin). */
export interface SingleNotificationResponseDto {
  success: true;
  message: string;
  data: NotificationResponseDto;
}

/** Response envelope for a bulk action, reporting how many rows were affected. */
export interface BulkNotificationResponseDto {
  success: true;
  message: string;
  data: { count: number };
}

/** Response envelope for an action with no body payload (e.g. clear one). */
export interface MessageResponseDto {
  success: true;
  message: string;
}

/** Body for PATCH /api/v1/notifications/:notificationId/pin. */
export interface SetPinBodyDto {
  pinned: boolean;
}
