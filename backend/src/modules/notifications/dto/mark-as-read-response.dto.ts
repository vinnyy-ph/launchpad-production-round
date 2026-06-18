import type { NotificationResponseDto } from "./notification-response.dto";

/**
 * Response envelope for PATCH /api/v1/notifications/:notificationId/read.
 */
export interface MarkAsReadResponseDto {
  success: true;
  message: string;
  data: NotificationResponseDto;
}
