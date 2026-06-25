import type { SupportingDoc } from "../supporting-doc.types";

export interface UpdateEvaluationInput {
  revieweeId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  grade?: number;
  highlights?: string[];
  lowlights?: string[];
  evaluation?: string;
  recommendation?: string;
  supportingDocs?: SupportingDoc[];
  send?: boolean;
}
