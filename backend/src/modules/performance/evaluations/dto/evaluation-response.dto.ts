export interface EvaluationResponseDto {
  id: string;
  reviewerId: string;
  revieweeId: string;
  reviewee: { id: string; fullName: string } | null;
  reviewer: { id: string; fullName: string } | null;
  periodStart: Date;
  periodEnd: Date;
  grade: number;
  highlights: string[];
  lowlights: string[];
  evaluation: string | null;
  recommendation: string | null;
  supportingDocUrls: string[];
  isSent: boolean;
  sentAt: Date | null;
  ackDeadline: Date | null;
  acknowledgement: {
    isDeemedAck: boolean;
    acknowledgedAt: Date | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
