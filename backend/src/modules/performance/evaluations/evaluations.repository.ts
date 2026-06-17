import { prisma } from "../../../core/database/prisma.service";
import type { CreateEvaluationData, ListEvaluationsQuery, UpdateEvaluationData } from "./dto";

export class EvaluationsRepository {
  async create(data: CreateEvaluationData) {
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
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.performanceEvaluation.count({ where }),
    ]);

    return { evaluations, total };
  }

  async findById(id: string) {
    return prisma.performanceEvaluation.findFirst({ where: { id, deletedAt: null } });
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
}
