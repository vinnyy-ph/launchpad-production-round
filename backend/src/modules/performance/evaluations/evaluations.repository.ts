import { prisma } from "../../../core/database/prisma.service";
import type { CreateEvaluationData, UpdateEvaluationData } from "./evaluations.types";

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

export async function findEvaluationById(id: string) {
  return prisma.performanceEvaluation.findUnique({ where: { id } });
}

export async function updateEvaluation(id: string, data: UpdateEvaluationData) {
  return prisma.performanceEvaluation.update({
    where: { id },
    data: {
      ...(data.revieweeId !== undefined && { revieweeId: data.revieweeId }),
      ...(data.evaluationPeriod !== undefined && { evaluationPeriod: data.evaluationPeriod }),
      ...(data.grade !== undefined && { grade: data.grade }),
      ...(data.highlights !== undefined && { highlights: data.highlights }),
      ...(data.lowlights !== undefined && { lowlights: data.lowlights }),
      ...(data.evaluation !== undefined && { evaluation: data.evaluation }),
      ...(data.recommendation !== undefined && { recommendation: data.recommendation }),
      ...(data.supportingDocUrl !== undefined && { supportingDocUrl: data.supportingDocUrl }),
      ...(data.isSent !== undefined && { isSent: data.isSent }),
      ...(data.sentAt !== undefined && { sentAt: data.sentAt }),
      ...(data.ackDeadline !== undefined && { ackDeadline: data.ackDeadline }),
    },
  });
}
