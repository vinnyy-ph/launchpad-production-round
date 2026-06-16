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

export interface ListEvaluationsQuery {
  page: number;
  limit: number;
  status?: "draft" | "sent";
}

export interface UpdateEvaluationInput {
  revieweeId?: string;
  evaluationPeriod?: string;
  grade?: number;
  highlights?: string;
  lowlights?: string;
  evaluation?: string;
  recommendation?: string;
  supportingDocUrl?: string;
  send?: boolean;
}

export interface UpdateEvaluationData {
  revieweeId?: string;
  evaluationPeriod?: string;
  grade?: number;
  highlights?: string;
  lowlights?: string;
  evaluation?: string;
  recommendation?: string;
  supportingDocUrl?: string;
  isSent?: boolean;
  sentAt?: Date;
  ackDeadline?: Date;
}
