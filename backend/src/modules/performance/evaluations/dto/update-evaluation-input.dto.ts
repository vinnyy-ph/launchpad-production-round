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
