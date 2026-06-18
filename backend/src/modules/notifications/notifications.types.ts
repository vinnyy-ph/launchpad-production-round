import type { NotificationType } from "@prisma/client";

/**
 * Input shape for creating a persisted in-app notification.
 */
export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  subject: string;
  body: string;
  linkUrl?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
}
