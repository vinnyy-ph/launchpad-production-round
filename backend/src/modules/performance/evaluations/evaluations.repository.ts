import { prisma } from "../../../core/database/prisma.service";
import type { Prisma } from "@prisma/client";
import type { CreateEvaluationData, ListEvaluationsQuery, UpdateEvaluationData } from "./dto";

export class EvaluationsRepository {
  async create(data: CreateEvaluationData) {
    return prisma.performanceEvaluation.create({
      data: {
        reviewerId: data.reviewerId,
        revieweeId: data.revieweeId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        grade: data.grade,
        highlights: data.highlights ?? [],
        lowlights: data.lowlights ?? [],
        evaluation: data.evaluation ?? null,
        recommendation: data.recommendation ?? null,
        supportingDocs: (data.supportingDocs ?? []) as unknown as Prisma.InputJsonValue,
        isSent: data.isSent,
        sentAt: data.sentAt ?? null,
        ackDeadline: data.ackDeadline ?? null,
      },
    });
  }

  async findVisible(
    employeeId: string,
    role: string,
    query: ListEvaluationsQuery,
    downwardIds: string[]
  ) {
    let visibilityFilter: any;

    if (role === "HR" || role === "ADMIN") {
      visibilityFilter = {
        OR: [
          { reviewerId: employeeId },
          { isSent: true },
        ],
      };
    } else {
      const allowedRevieweeIds = [employeeId, ...downwardIds];
      visibilityFilter = {
        OR: [
          { reviewerId: employeeId },
          {
            isSent: true,
            revieweeId: { in: allowedRevieweeIds },
          },
        ],
      };
    }

    let statusFilter: any;
    if (query.status === "draft") {
      statusFilter = {
        isSent: false,
        reviewerId: employeeId,
      };
    } else if (query.status === "sent") {
      statusFilter = {
        isSent: true,
        ...visibilityFilter,
      };
    } else {
      statusFilter = visibilityFilter;
    }

    const where = {
      deletedAt: null,
      ...statusFilter,
    };

    const [evaluations, total] = await Promise.all([
      prisma.performanceEvaluation.findMany({
        where,
        include: {
          acknowledgement: true,
          reviewee: { select: { id: true, firstName: true, lastName: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.performanceEvaluation.count({ where }),
    ]);

    return { evaluations, total };
  }

  async findById(id: string) {
    return prisma.performanceEvaluation.findFirst({
      where: { id, deletedAt: null },
      include: {
        acknowledgement: true,
        reviewee: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async softDelete(id: string) {
    return prisma.performanceEvaluation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async markAsSent(id: string, sentAt: Date, ackDeadline: Date) {
    return prisma.performanceEvaluation.update({
      where: { id },
      data: { isSent: true, sentAt, ackDeadline },
    });
  }

  async update(id: string, data: UpdateEvaluationData) {
    return prisma.performanceEvaluation.update({
      where: { id },
      data: {
        ...(data.revieweeId !== undefined && { revieweeId: data.revieweeId }),
        ...(data.periodStart !== undefined && { periodStart: data.periodStart }),
        ...(data.periodEnd !== undefined && { periodEnd: data.periodEnd }),
        ...(data.grade !== undefined && { grade: data.grade }),
        ...(data.highlights !== undefined && { highlights: data.highlights }),
        ...(data.lowlights !== undefined && { lowlights: data.lowlights }),
        ...(data.evaluation !== undefined && { evaluation: data.evaluation }),
        ...(data.recommendation !== undefined && { recommendation: data.recommendation }),
        ...(data.supportingDocs !== undefined && { supportingDocs: data.supportingDocs as unknown as Prisma.InputJsonValue }),
        ...(data.isSent !== undefined && { isSent: data.isSent }),
        ...(data.sentAt !== undefined && { sentAt: data.sentAt }),
        ...(data.ackDeadline !== undefined && { ackDeadline: data.ackDeadline }),
      },
    });
  }

  async createAcknowledgement(evaluationId: string, employeeId: string) {
    return prisma.evaluationAcknowledgement.create({
      data: { evaluationId, employeeId, isDeemedAck: false },
    });
  }

  async acknowledgeById(evaluationId: string) {
    return prisma.evaluationAcknowledgement.update({
      where: { evaluationId },
      data: { acknowledgedAt: new Date() },
    });
  }

  async markDeemedAcknowledged(evaluationId: string) {
    return prisma.evaluationAcknowledgement.update({
      where: { evaluationId },
      data: { isDeemedAck: true },
    });
  }

  async markManyDeemedAcknowledged(evaluationIds: string[]) {
    return prisma.evaluationAcknowledgement.updateMany({
      where: { evaluationId: { in: evaluationIds } },
      data: { isDeemedAck: true },
    });
  }

  /**
   * Acknowledgements that should auto-settle to deemed-acknowledged: a sent, non-deleted
   * evaluation past its ackDeadline that the reviewee has neither acknowledged nor been
   * deemed-acknowledged for. Returns the reviewer id so the settlement can notify them.
   */
  async findDueDeemedAck(now: Date) {
    return prisma.evaluationAcknowledgement.findMany({
      where: {
        acknowledgedAt: null,
        isDeemedAck: false,
        evaluation: { is: { isSent: true, deletedAt: null, ackDeadline: { lt: now } } },
      },
      select: {
        evaluationId: true,
        evaluation: { select: { reviewerId: true, revieweeId: true } },
      },
    });
  }
}
