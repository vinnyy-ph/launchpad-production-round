import { prisma } from "../../../core/database/prisma.service";
import { createEvaluation } from "./evaluations.repository";
import { EVAL_ACK_DEADLINE_DAYS, EVAL_ERROR_MESSAGES } from "./evaluations.constants";
import type { CreateEvaluationInput } from "./evaluations.types";

export async function handleCreateEvaluation(input: CreateEvaluationInput, userId: string) {
  const reviewer = await prisma.employee.findUnique({ where: { userId } });
  if (!reviewer) throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);

  const reviewee = await prisma.employee.findUnique({ where: { id: input.revieweeId } });
  if (!reviewee) throw new Error(EVAL_ERROR_MESSAGES.REVIEWEE_NOT_FOUND);

  if (reviewee.supervisorId !== reviewer.id) {
    throw new Error(EVAL_ERROR_MESSAGES.NOT_DIRECT_SUPERVISOR);
  }

  const now = new Date();
  const sendFields = input.send
    ? {
        isSent: true as const,
        sentAt: now,
        ackDeadline: new Date(now.getTime() + EVAL_ACK_DEADLINE_DAYS * 24 * 60 * 60 * 1000),
      }
    : { isSent: false as const };

  return createEvaluation({
    reviewerId: reviewer.id,
    revieweeId: input.revieweeId,
    evaluationPeriod: input.evaluationPeriod,
    grade: input.grade,
    highlights: input.highlights,
    lowlights: input.lowlights,
    evaluation: input.evaluation,
    recommendation: input.recommendation,
    supportingDocUrl: input.supportingDocUrl,
    ...sendFields,
  });
}
