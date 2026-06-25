import type { PerformanceEvaluation, EvaluationAcknowledgement, User } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import { EVAL_ACK_DEADLINE_DAYS, EVAL_ERROR_MESSAGES, EVAL_UPLOAD_ERROR_MESSAGES } from "./evaluations.constants";
import { EvaluationsRepository } from "./evaluations.repository";
import { NotificationsService } from "../../notifications/notifications.service";
import { EmailService } from "../../../core/email";
import { buildEvaluationNotificationEmailHtml } from "../../../core/email/templates/evaluation-notification.template";
import { downwardChain, upwardChain, ACTIVE_EMPLOYEE } from "../../shared";
import type {
  CreateEvaluationInput,
  EvaluationResponseDto,
  ListEvaluationsQuery,
  ListEvaluationsResponseDto,
  ListRevieweesResponseDto,
  UpdateEvaluationInput,
} from "./dto";
import type { SupportingDoc } from "./supporting-doc.types";

type EvaluationWithAck = PerformanceEvaluation & {
  acknowledgement: Pick<EvaluationAcknowledgement, "isDeemedAck" | "acknowledgedAt"> | null;
  reviewee?: { id: string; firstName: string; lastName: string } | null;
  reviewer?: { id: string; firstName: string; lastName: string } | null;
};

export class EvaluationsService {
  constructor(
    private readonly evaluationsRepository = new EvaluationsRepository(),
    private readonly notificationsService = new NotificationsService(),
    private readonly emailService = new EmailService(),
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

    const settled = await this.settleDeemedAckMany(evaluations);

    return {
      success: true,
      data: settled.map((evaluation) => this.toResponse(evaluation)),
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

    const settled = await this.settleDeemedAck(evaluation);

    const employee = await prisma.employee.findUnique({ where: { userId: currentUser.id } });

    if (!settled.isSent) {
      if (!employee || settled.reviewerId !== employee.id) {
        throw new Error(EVAL_ERROR_MESSAGES.NOT_AUTHORIZED);
      }
    } else {
      const isHr = currentUser.role === "HR" || currentUser.role === "ADMIN";
      if (isHr) {
        return this.toResponse(settled);
      }

      if (!employee) {
        throw new Error(EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE);
      }

      const isReviewer = settled.reviewerId === employee.id;
      const isReviewee = settled.revieweeId === employee.id;

      if (!isReviewer && !isReviewee) {
        const uChain = await upwardChain(settled.revieweeId);
        const isUpwardSupervisor = uChain.includes(employee.id);
        if (!isUpwardSupervisor) {
          throw new Error(EVAL_ERROR_MESSAGES.NOT_AUTHORIZED);
        }
      }
    }

    return this.toResponse(settled);
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
      supportingDocs: input.supportingDocs ?? [],
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

    if (input.send) {
      await this.notificationsService.notifyNewEvaluation(
        evaluation.revieweeId,
        evaluation.id,
      );
      await this.sendEvaluationEmail(evaluation.revieweeId, evaluation.id);
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
    docsMerge?: { keepUrls: string[]; newDocs: SupportingDoc[] },
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

    if (docsMerge) {
      const existingDocs = (evaluation.supportingDocs ?? []) as unknown as SupportingDoc[];
      const retained = existingDocs.filter(
        (d) => d.kind === "file" && docsMerge.keepUrls.includes(d.url),
      );
      const merged = [...retained, ...docsMerge.newDocs];
      if (merged.length > 5) {
        throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_DOCS);
      }
      input = { ...input, supportingDocs: merged };
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
            ...(updateData.supportingDocs !== undefined && { supportingDocs: updateData.supportingDocs }),
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

    if (input.send) {
      await this.notificationsService.notifyNewEvaluation(
        updated.revieweeId,
        evaluationId,
      );
      await this.sendEvaluationEmail(updated.revieweeId, evaluationId);
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

    await this.notificationsService.notifyNewEvaluation(
      evaluation.revieweeId,
      evaluationId,
    );
    await this.sendEvaluationEmail(evaluation.revieweeId, evaluationId);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EVALUATION_SENT,
      data: this.toResponse({ ...updated, acknowledgement }),
    };
  }

  /**
   * Emails the reviewee that a new performance evaluation is waiting for them, with a
   * link to their Performance page. Mirrors `notifyNewEvaluation`: fire-and-forget, so
   * sending the evaluation is never blocked by an email delivery failure.
   */
  private async sendEvaluationEmail(revieweeId: string, evaluationId: string): Promise<void> {
    try {
      const reviewee = await prisma.employee.findUnique({
        where: { id: revieweeId },
        select: { companyEmail: true, firstName: true, lastName: true },
      });

      if (!reviewee) {
        return;
      }

      // Deep-link to the exact evaluation on the shared surveys page, matching the
      // in-app notification link (`?tab=acknowledgements&eval=<evaluationId>`).
      const evaluationUrl = `${this.resolveAppUrl()}/employee/surveys?tab=acknowledgements&eval=${evaluationId}`;

      await this.emailService.sendEmail({
        to: reviewee.companyEmail,
        subject: "New performance evaluation – please review and acknowledge",
        html: buildEvaluationNotificationEmailHtml({
          firstName: reviewee.firstName,
          lastName: reviewee.lastName,
          evaluationUrl,
        }),
      });
    } catch {
      // Fire-and-forget: sending the evaluation must succeed even if email delivery fails.
    }
  }

  /** Returns the frontend base URL used in evaluation links. */
  private resolveAppUrl(): string {
    return (
      process.env.CORS_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:3000"
    );
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

  /**
   * Scheduled counterpart to the on-read deemed-ack settlement: flips every sent evaluation
   * past its ackDeadline (still unacknowledged, not yet deemed) to deemed-acknowledged and
   * notifies each reviewer. Driven by the hourly cron service so status settles even when
   * nobody reads the evaluation. Returns the number flipped. Idempotent — already-settled
   * rows are excluded by the query.
   */
  async settleAllDeemedAck(now: Date = new Date()): Promise<number> {
    const due = await this.evaluationsRepository.findDueDeemedAck(now);
    if (due.length === 0) return 0;

    await this.evaluationsRepository.markManyDeemedAcknowledged(due.map((d) => d.evaluationId));

    for (const d of due) {
      await this.notificationsService.notifyEvalDeemedAck(
        d.evaluation.reviewerId,
        d.evaluation.revieweeId,
        d.evaluationId,
      );
    }

    return due.length;
  }

  /**
   * Deemed-acknowledgement, settled lazily on read: a sent evaluation that the reviewee
   * has neither acknowledged nor been deemed-acknowledged for, and whose ackDeadline
   * (sentAt + EVAL_ACK_DEADLINE_DAYS) has passed, is flipped to deemed-acknowledged.
   * Same observable outcome as a scheduled job, anchored to issuance, no scheduler.
   */
  private isPastAckDeadline(evaluation: EvaluationWithAck, now: Date): boolean {
    return (
      evaluation.isSent &&
      evaluation.acknowledgement !== null &&
      !evaluation.acknowledgement.acknowledgedAt &&
      !evaluation.acknowledgement.isDeemedAck &&
      evaluation.ackDeadline !== null &&
      now > evaluation.ackDeadline
    );
  }

  private async settleDeemedAck(evaluation: EvaluationWithAck): Promise<EvaluationWithAck> {
    if (!this.isPastAckDeadline(evaluation, new Date())) return evaluation;
    await this.evaluationsRepository.markDeemedAcknowledged(evaluation.id);
    return {
      ...evaluation,
      acknowledgement: evaluation.acknowledgement
        ? { ...evaluation.acknowledgement, isDeemedAck: true }
        : null,
    };
  }

  private async settleDeemedAckMany(evaluations: EvaluationWithAck[]): Promise<EvaluationWithAck[]> {
    const now = new Date();
    const toFlip = evaluations.filter((e) => this.isPastAckDeadline(e, now)).map((e) => e.id);
    if (toFlip.length === 0) return evaluations;
    await this.evaluationsRepository.markManyDeemedAcknowledged(toFlip);
    const flipped = new Set(toFlip);
    return evaluations.map((e) =>
      flipped.has(e.id) && e.acknowledgement
        ? { ...e, acknowledgement: { ...e.acknowledgement, isDeemedAck: true } }
        : e,
    );
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
      reviewer: evaluation.reviewer
        ? {
            id: evaluation.reviewer.id,
            fullName: `${evaluation.reviewer.firstName} ${evaluation.reviewer.lastName}`,
          }
        : null,
      periodStart: evaluation.periodStart,
      periodEnd: evaluation.periodEnd,
      grade: evaluation.grade,
      highlights: evaluation.highlights,
      lowlights: evaluation.lowlights,
      evaluation: evaluation.evaluation,
      recommendation: evaluation.recommendation,
      supportingDocs: (evaluation.supportingDocs ?? []) as unknown as SupportingDoc[],
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
