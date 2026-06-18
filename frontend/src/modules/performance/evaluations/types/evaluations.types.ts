// Mirrors the backend EvaluationResponseDto. Dates arrive as ISO strings over JSON.
export interface Evaluation {
  id: string;
  reviewerId: string;
  revieweeId: string;
  reviewee: { id: string; fullName: string } | null;
  reviewer: { id: string; fullName: string } | null;
  periodStart: string;
  periodEnd: string;
  grade: number;
  highlights: string[];
  lowlights: string[];
  evaluation: string | null;
  recommendation: string | null;
  supportingDocUrl: string | null;
  isSent: boolean;
  sentAt: string | null;
  ackDeadline: string | null;
  acknowledgement: { isDeemedAck: boolean; acknowledgedAt: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

// One of the current supervisor's active direct reports (from GET /evaluations/reviewees).
export interface Reviewee {
  id: string;
  fullName: string;
  jobTitle: string | null;
}

// Request body for create; update accepts the same fields as Partial.
export interface EvaluationInput {
  revieweeId: string;
  periodStart: string; // ISO
  periodEnd: string; // ISO
  grade: number;
  highlights?: string[];
  lowlights?: string[];
  evaluation?: string;
  recommendation?: string;
  supportingDocUrl?: string;
}

export const GRADE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Below Expectations",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Exceptional",
};
