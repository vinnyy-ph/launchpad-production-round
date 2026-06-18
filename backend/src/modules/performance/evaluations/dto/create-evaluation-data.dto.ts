export interface CreateEvaluationData {
  reviewerId: string;
  revieweeId: string;
  periodStart: Date;
  periodEnd: Date;
  grade: number;
  highlights?: string[];
  lowlights?: string[];
  evaluation?: string | null;
  recommendation?: string | null;
  supportingDocUrl?: string | null;
  isSent: boolean;
  sentAt?: Date | null;
  ackDeadline?: Date | null;
}
