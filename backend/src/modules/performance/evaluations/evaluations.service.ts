import type { PerformanceEvaluation, EvaluationAcknowledgement, User } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import { EVAL_ACK_DEADLINE_DAYS, EVAL_ERROR_MESSAGES } from "./evaluations.constants";
import { EvaluationsRepository } from "./evaluations.repository";
import { downwardChain, upwardChain, ACTIVE_EMPLOYEE } from "../../shared";
import type {
  CreateEvaluationInput,
  EvaluationResponseDto,
  ListEvaluationsQuery,
  ListEvaluationsResponseDto,
  ListRevieweesResponseDto,
  UpdateEvaluationInput,
} from "./dto";

type EvaluationWithAck = PerformanceEvaluation & {
  acknowledgement: Pick<EvaluationAcknowledgement, "isDeemedAck" | "acknowledgedAt"> | null;
  reviewee?: { id: string; firstName: string; lastName: string } | null;
};

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

    const createData = {
      reviewerId: reviewer.id,
      revieweeId: input.revieweeId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      grade: input.grade,
      highlights: input.highlights ?? [],
      lowlights: input.lowlights ?? [],
      evaluation: input.evaluation ?? null,
      recommendation: input.recommendation ?? null,
      supportingDocUrl: input.supportingDocUrl ?? null,
      ...sendFields,
    };

    let evaluation: Awaited<ReturnType<typeof this.evaluationsRepository.create>>;
    let acknowledgement: Awaited<ReturnType<typeof this.evaluationsRepository.createAcknowledgement>> | null;

    if (input.send) {
      [evaluation, acknowledgement] = await prisma.$transaction(async (tx) => {
        const created = await tx.performanceEvaluation.create({ data: createData });
        const ack = await tx.evaluationAcknowledgement.create({
          data: { evaluationId: created.id, employeeId: created.revieweeId, isDeemedAck: false },
        });
        return [created, ack] as const;
      });
    } else {
      evaluation = await this.evaluationsRepository.create(createData);
      acknowledgement = null;
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EVALUATION_CREATED,
      data: this.toResponse({ ...evaluation, acknowledgement }),
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
    const updateData = { ...fields, ...sendFields };

    let updated: Awaited<ReturnType<typeof this.evaluationsRepository.update>>;
    let acknowledgement: Awaited<ReturnType<typeof this.evaluationsRepository.createAcknowledgement>> | null;

    if (input.send) {
      [updated, acknowledgement] = await prisma.$transaction(async (tx) => {
        const updatedRecord = await tx.performanceEvaluation.update({
          where: { id: evaluationId },
          data: {
            ...(updateData.revieweeId !== undefined && { revieweeId: updateData.revieweeId }),
            ...(updateData.periodStart !== undefined && { periodStart: updateData.periodStart }),
            ...(updateData.periodEnd !== undefined && { periodEnd: updateData.periodEnd }),
            ...(updateData.grade !== undefined && { grade: updateData.grade }),
            ...(updateData.highlights !== undefined && { highlights: updateData.highlights }),
            ...(updateData.lowlights !== undefined && { lowlights: updateData.lowlights }),
            ...(updateData.evaluation !== undefined && { evaluation: updateData.evaluation }),
            ...(updateData.recommendation !== undefined && { recommendation: updateData.recommendation }),
            ...(updateData.supportingDocUrl !== undefined && { supportingDocUrl: updateData.supportingDocUrl }),
            isSent: true,
            sentAt: updateData.sentAt,
            ackDeadline: updateData.ackDeadline,
          },
        });
        const ack = await tx.evaluationAcknowledgement.create({
          data: { evaluationId, employeeId: updatedRecord.revieweeId, isDeemedAck: false },
        });
        return [updatedRecord, ack] as const;
      });
    } else {
      updated = await this.evaluationsRepository.update(evaluationId, updateData);
      acknowledgement = null;
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EVALUATION_UPDATED,
      data: this.toResponse({ ...updated, acknowledgement }),
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
    const [updated, acknowledgement] = await prisma.$transaction([
      prisma.performanceEvaluation.update({
        where: { id: evaluationId },
        data: { isSent: true, sentAt: now, ackDeadline },
      }),
      prisma.evaluationAcknowledgement.create({
        data: { evaluationId, employeeId: evaluation.revieweeId, isDeemedAck: false },
      }),
    ]);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EVALUATION_SENT,
      data: this.toResponse({ ...updated, acknowledgement }),
    };
  }

  async acknowledge(evaluationId: string, userId: string) {
    const evaluation = await this.evaluationsRepository.findById(evaluationId);
    if (!evaluation) throw new Error(EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND);

    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new Error(EVAL_ERROR_MESSAGES.REVIEWEE_NOT_EMPLOYEE);

    if (evaluation.revieweeId !== employee.id) throw new Error(EVAL_ERROR_MESSAGES.NOT_REVIEWEE);
    if (!evaluation.isSent) throw new Error(EVAL_ERROR_MESSAGES.EVALUATION_NOT_SENT);
    if (!evaluation.acknowledgement) throw new Error(EVAL_ERROR_MESSAGES.EVALUATION_NOT_SENT);
    if (evaluation.acknowledgement.acknowledgedAt) throw new Error(EVAL_ERROR_MESSAGES.ALREADY_ACKNOWLEDGED);

    const acknowledgement = await this.evaluationsRepository.acknowledgeById(evaluationId);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EVALUATION_ACKNOWLEDGED,
      data: this.toResponse({ ...evaluation, acknowledgement }),
    };
  }

  async listReviewees(currentUser: User): Promise<ListRevieweesResponseDto> {
    const reviewer = await prisma.employee.findUnique({ where: { userId: currentUser.id } });
    if (!reviewer) throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);

    const reports = await prisma.employee.findMany({
      where: { supervisorId: reviewer.id, ...ACTIVE_EMPLOYEE },
      select: { id: true, firstName: true, lastName: true, jobTitle: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return {
      success: true,
      data: reports.map((report) => ({
        id: report.id,
        fullName: [report.firstName, report.lastName].filter(Boolean).join(" "),
        jobTitle: report.jobTitle,
      })),
    };
  }

  private toResponse(evaluation: EvaluationWithAck): EvaluationResponseDto {
    return {
      id: evaluation.id,
      reviewerId: evaluation.reviewerId,
      revieweeId: evaluation.revieweeId,
      reviewee: evaluation.reviewee
        ? {
            id: evaluation.reviewee.id,
            fullName: `${evaluation.reviewee.firstName} ${evaluation.reviewee.lastName}`,
          }
        : null,
      periodStart: evaluation.periodStart,
      periodEnd: evaluation.periodEnd,
      grade: evaluation.grade,
      highlights: evaluation.highlights,
      lowlights: evaluation.lowlights,
      evaluation: evaluation.evaluation,
      recommendation: evaluation.recommendation,
      supportingDocUrl: evaluation.supportingDocUrl,
      isSent: evaluation.isSent,
      sentAt: evaluation.sentAt,
      ackDeadline: evaluation.ackDeadline,
      acknowledgement: evaluation.acknowledgement
        ? {
            isDeemedAck: evaluation.acknowledgement.isDeemedAck,
            acknowledgedAt: evaluation.acknowledgement.acknowledgedAt,
          }
        : null,
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt,
    };
  }
}
