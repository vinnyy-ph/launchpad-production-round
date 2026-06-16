export interface CreateEvaluationInput {
  revieweeId: string;
  evaluationPeriod: string;
  grade: number;
  highlights?: string;
  lowlights?: string;
  evaluation?: string;
  recommendation?: string;
  supportingDocUrl?: string;
}
