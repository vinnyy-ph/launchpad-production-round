import { prisma } from "../../../core/database/prisma.service";
import {
  createEvaluation,
  findEvaluationsByReviewer,
  findEvaluationById,
  softDeleteEvaluation,
  updateEvaluation,
} from "./evaluations.repository";
import { EVAL_ACK_DEADLINE_DAYS, EVAL_ERROR_MESSAGES } from "./evaluations.constants";
import type { CreateEvaluationInput, ListEvaluationsQuery, UpdateEvaluationInput } from "./evaluations.types";

export async function handleListEvaluations(query: ListEvaluationsQuery, userId: string) {
  const reviewer = await prisma.employee.findUnique({ where: { userId } });
  if (!reviewer) throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);

  const { evaluations, total } = await findEvaluationsByReviewer(reviewer.id, query);

  return {
    evaluations,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

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

export async function handleUpdateEvaluation(
  evaluationId: string,
  input: UpdateEvaluationInput,
  userId: string,
) {
  const evaluation = await findEvaluationById(evaluationId);
  if (!evaluation) throw new Error(EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND);

  const reviewer = await prisma.employee.findUnique({ where: { userId } });
  if (!reviewer) throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);

  if (evaluation.reviewerId !== reviewer.id) throw new Error(EVAL_ERROR_MESSAGES.NOT_REVIEWER);
  if (evaluation.isSent) throw new Error(EVAL_ERROR_MESSAGES.ALREADY_SENT);

  if (input.revieweeId && input.revieweeId !== evaluation.revieweeId) {
    const newReviewee = await prisma.employee.findUnique({ where: { id: input.revieweeId } });
    if (!newReviewee) throw new Error(EVAL_ERROR_MESSAGES.REVIEWEE_NOT_FOUND);
    if (newReviewee.supervisorId !== reviewer.id) throw new Error(EVAL_ERROR_MESSAGES.NOT_DIRECT_SUPERVISOR);
  }

  const now = new Date();
  const sendFields = input.send
    ? {
        isSent: true,
        sentAt: now,
        ackDeadline: new Date(now.getTime() + EVAL_ACK_DEADLINE_DAYS * 24 * 60 * 60 * 1000),
      }
    : {};

  const { send: _, ...fields } = input;
  return updateEvaluation(evaluationId, { ...fields, ...sendFields });
}

export async function handleDeleteEvaluation(evaluationId: string, userId: string) {
  const evaluation = await findEvaluationById(evaluationId);
  if (!evaluation) throw new Error(EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND);

  const reviewer = await prisma.employee.findUnique({ where: { userId } });
  if (!reviewer) throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);

  if (evaluation.reviewerId !== reviewer.id) throw new Error(EVAL_ERROR_MESSAGES.NOT_REVIEWER);
  if (evaluation.isSent) throw new Error(EVAL_ERROR_MESSAGES.ALREADY_SENT);

  await softDeleteEvaluation(evaluationId);
}
