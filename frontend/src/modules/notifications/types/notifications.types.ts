export type NotificationType =
  | "ONBOARDING_INVITE"
  | "ONBOARDING_COMPLETE"
  | "ONBOARDING_STATUS"
  | "OFFBOARDING_STARTED"
  | "OFFBOARDING_STATUS"
  | "CLEARANCE_SIGN_REQUEST"
  | "CLEARANCE_REJECTED"
  | "NEW_PULSE"
  | "PULSE_REMINDER"
  | "NEW_EVALUATION"
  | "EVAL_ACK_REMINDER";

export interface Notification {
  id: string;
  type: NotificationType;
  recipientEmployeeId: string;
  subject: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}
