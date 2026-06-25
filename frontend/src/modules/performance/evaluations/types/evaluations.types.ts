export type SupportingDoc =
  | { kind: "file"; url: string; label: string }
  | { kind: "link"; url: string; label: string };

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
  supportingDocs: SupportingDoc[];
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
  links?: { url: string; label?: string }[];
  /** Cloudinary urls of existing file docs to retain on update (full-set contract). */
  keepFiles?: string[];
}

export const GRADE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Below Expectations",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Exceptional",
};
