import type { PerformanceEvaluation, User } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import { EVAL_ACK_DEADLINE_DAYS, EVAL_ERROR_MESSAGES } from "./evaluations.constants";
import { EvaluationsRepository } from "./evaluations.repository";
import { downwardChain, upwardChain } from "../../shared";
import type {
  CreateEvaluationInput,
  EvaluationResponseDto,
  ListEvaluationsQuery,
  ListEvaluationsResponseDto,
  UpdateEvaluationInput,
} from "./dto";

export class EvaluationsService {
  constructor(
    private readonly evaluationsRepository = new EvaluationsRepository(),
  ) {}

  async list(query: ListEvaluationsQuery, currentUser: User): Promise<ListEvaluationsResponseDto> {
    const employee = await prisma.employee.findUnique({ where: { userId: currentUser.id } });
    const isHr = currentUser.role === "HR" || currentUser.role === "ADMIN";
    if (!employee && !isHr) throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);

    const employeeId = employee?.id ?? "";
    const downwardIds = employee ? await downwardChain(employee.id) : [];

    const { evaluations, total } = await this.evaluationsRepository.findVisible(
      employeeId,
      currentUser.role,
      query,
      downwardIds,
    );

    return {
      success: true,
      data: evaluations.map((evaluation) => this.toResponse(evaluation)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async get(evaluationId: string, currentUser: User): Promise<EvaluationResponseDto> {
    const evaluation = await this.evaluationsRepository.findById(evaluationId);
    if (!evaluation) throw new Error(EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND);

    const employee = await prisma.employee.findUnique({ where: { userId: currentUser.id } });

    if (!evaluation.isSent) {
      if (!employee || evaluation.reviewerId !== employee.id) {
        throw new Error(EVAL_ERROR_MESSAGES.NOT_AUTHORIZED);
      }
    } else {
      const isHr = currentUser.role === "HR" || currentUser.role === "ADMIN";
      if (isHr) {
        return this.toResponse(evaluation);
      }

      if (!employee) {
        throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);
      }

      const isReviewer = evaluation.reviewerId === employee.id;
      const isReviewee = evaluation.revieweeId === employee.id;

      if (!isReviewer && !isReviewee) {
        const uChain = await upwardChain(evaluation.revieweeId);
        const isUpwardSupervisor = uChain.includes(employee.id);
        if (!isUpwardSupervisor) {
          throw new Error(EVAL_ERROR_MESSAGES.NOT_AUTHORIZED);
        }
      }
    }

    return this.toResponse(evaluation);
  }

  async create(input: CreateEvaluationInput, userId: string) {
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

    const evaluation = await this.evaluationsRepository.create({
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

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EVALUATION_CREATED,
      data: this.toResponse(evaluation),
    };
  }

  async update(
    evaluationId: string,
    input: UpdateEvaluationInput,
    userId: string,
  ) {
    const evaluation = await this.evaluationsRepository.findById(evaluationId);
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
    const updated = await this.evaluationsRepository.update(evaluationId, { ...fields, ...sendFields });

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EVALUATION_UPDATED,
      data: this.toResponse(updated),
    };
  }

  async delete(evaluationId: string, userId: string) {
    const evaluation = await this.evaluationsRepository.findById(evaluationId);
    if (!evaluation) throw new Error(EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND);

    const reviewer = await prisma.employee.findUnique({ where: { userId } });
    if (!reviewer) throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);

    if (evaluation.reviewerId !== reviewer.id) throw new Error(EVAL_ERROR_MESSAGES.NOT_REVIEWER);
    if (evaluation.isSent) throw new Error(EVAL_ERROR_MESSAGES.ALREADY_SENT);

    await this.evaluationsRepository.softDelete(evaluationId);
  }

  async send(evaluationId: string, userId: string) {
    const evaluation = await this.evaluationsRepository.findById(evaluationId);
    if (!evaluation) throw new Error(EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND);

    const reviewer = await prisma.employee.findUnique({ where: { userId } });
    if (!reviewer) throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);

    if (evaluation.reviewerId !== reviewer.id) throw new Error(EVAL_ERROR_MESSAGES.NOT_REVIEWER);
    if (evaluation.isSent) throw new Error(EVAL_ERROR_MESSAGES.ALREADY_SENT);

    const now = new Date();
    const ackDeadline = new Date(now.getTime() + EVAL_ACK_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
    const updated = await this.evaluationsRepository.markAsSent(evaluationId, now, ackDeadline);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EVALUATION_SENT,
      data: this.toResponse(updated),
    };
  }

  private toResponse(evaluation: PerformanceEvaluation): EvaluationResponseDto {
    return {
      id: evaluation.id,
      reviewerId: evaluation.reviewerId,
      revieweeId: evaluation.revieweeId,
      evaluationPeriod: evaluation.evaluationPeriod,
      grade: evaluation.grade,
      highlights: evaluation.highlights,
      lowlights: evaluation.lowlights,
      evaluation: evaluation.evaluation,
      recommendation: evaluation.recommendation,
      supportingDocUrl: evaluation.supportingDocUrl,
      isSent: evaluation.isSent,
      sentAt: evaluation.sentAt,
      ackDeadline: evaluation.ackDeadline,
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt,
    };
  }
}
