import { emitToUser } from "../../../core/socket/socket.service";
import type { NotificationResponseDto } from "../dto";
import { NOTIFICATION_SOCKET_EVENT } from "../notifications.constants";

/**
 * Delivers real-time in-app notifications over Socket.IO.
 */
export class InAppChannel {
  /**
   * Pushes a notification payload to the recipient's user room.
   * No-op when Socket.IO is not initialized (e.g. during tests).
   */
  deliver(userId: string, notification: NotificationResponseDto): void {
    emitToUser(userId, NOTIFICATION_SOCKET_EVENT, notification);
  }
}
