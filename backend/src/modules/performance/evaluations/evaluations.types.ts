export interface CreateEvaluationInput {
  revieweeId: string;
  evaluationPeriod: string;
  grade: number;
  highlights?: string;
  lowlights?: string;
  evaluation?: string;
  recommendation?: string;
  supportingDocUrl?: string;
  send?: boolean;
}

export interface CreateEvaluationData {
  reviewerId: string;
  revieweeId: string;
  evaluationPeriod: string;
  grade: number;
  highlights?: string;
  lowlights?: string;
  evaluation?: string;
  recommendation?: string;
  supportingDocUrl?: string;
  isSent: boolean;
  sentAt?: Date;
  ackDeadline?: Date;
}
