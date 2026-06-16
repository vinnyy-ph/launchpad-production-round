import { prisma } from "../../../core/database/prisma.service";
import type { CreateEvaluationInput } from "./evaluations.types";

export async function createEvaluation(reviewerId: string, data: CreateEvaluationInput) {
  return prisma.performanceEvaluation.create({
    data: {
      reviewerId,
      revieweeId: data.revieweeId,
      evaluationPeriod: data.evaluationPeriod,
      grade: data.grade,
      highlights: data.highlights ?? null,
      lowlights: data.lowlights ?? null,
      evaluation: data.evaluation ?? null,
      recommendation: data.recommendation ?? null,
      supportingDocUrl: data.supportingDocUrl ?? null,
    },
  });
}
