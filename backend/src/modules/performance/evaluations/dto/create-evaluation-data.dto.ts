export interface CreateEvaluationData {
  reviewerId: string;
  revieweeId: string;
  evaluationPeriod: string;
  grade: number;
  highlights?: string | null;
  lowlights?: string | null;
  evaluation?: string | null;
  recommendation?: string | null;
  supportingDocUrl?: string | null;
  isSent: boolean;
  sentAt?: Date | null;
  ackDeadline?: Date | null;
}
