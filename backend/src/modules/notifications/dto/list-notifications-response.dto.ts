import type { NotificationResponseDto } from "./notification-response.dto";

/**
 * Response envelope for GET /api/v1/notifications.
 */
export interface ListNotificationsResponseDto {
  success: true;
  message: string;
  data: NotificationResponseDto[];
}
