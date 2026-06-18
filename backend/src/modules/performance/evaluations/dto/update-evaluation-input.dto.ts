export interface UpdateEvaluationInput {
  revieweeId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  grade?: number;
  highlights?: string[];
  lowlights?: string[];
  evaluation?: string;
  recommendation?: string;
  supportingDocUrl?: string;
  send?: boolean;
}
