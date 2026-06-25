/**
 * Single in-app notification returned to the client.
 */
export interface NotificationResponseDto {
  id: string;
  type: string;
  subject: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
}
