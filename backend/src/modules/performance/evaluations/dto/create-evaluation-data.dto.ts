import type { SupportingDoc } from "../supporting-doc.types";

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
  supportingDocs?: SupportingDoc[];
  isSent: boolean;
  sentAt?: Date | null;
  ackDeadline?: Date | null;
}
