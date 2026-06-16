import { prisma } from "../../../core/database/prisma.service";
import type { CreateEvaluationData } from "./evaluations.types";

export async function createEvaluation(data: CreateEvaluationData) {
  return prisma.performanceEvaluation.create({
    data: {
      reviewerId: data.reviewerId,
      revieweeId: data.revieweeId,
      evaluationPeriod: data.evaluationPeriod,
      grade: data.grade,
      highlights: data.highlights ?? null,
      lowlights: data.lowlights ?? null,
      evaluation: data.evaluation ?? null,
      recommendation: data.recommendation ?? null,
      supportingDocUrl: data.supportingDocUrl ?? null,
      isSent: data.isSent,
      sentAt: data.sentAt ?? null,
      ackDeadline: data.ackDeadline ?? null,
    },
  });
}
