export interface UpdateEvaluationData {
  revieweeId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  grade?: number;
  highlights?: string[];
  lowlights?: string[];
  evaluation?: string | null;
  recommendation?: string | null;
  supportingDocUrls?: string[];
  isSent?: boolean;
  sentAt?: Date | null;
  ackDeadline?: Date | null;
}
