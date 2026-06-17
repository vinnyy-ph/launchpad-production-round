import { prisma } from "../../core/database/prisma.service";

export const mockedPrisma = jest.mocked(prisma);

export const employeeFindUniqueMock = mockedPrisma.employee.findUnique as jest.Mock;
export const evalFindManyMock = mockedPrisma.performanceEvaluation.findMany as jest.Mock;
export const evalCountMock = mockedPrisma.performanceEvaluation.count as jest.Mock;
export const evalFindFirstMock = mockedPrisma.performanceEvaluation.findFirst as jest.Mock;
export const evalCreateMock = mockedPrisma.performanceEvaluation.create as jest.Mock;
export const evalUpdateMock = mockedPrisma.performanceEvaluation.update as jest.Mock;

export function resetEvaluationMocks() {
  employeeFindUniqueMock.mockReset();
  evalFindManyMock.mockReset();
  evalCountMock.mockReset();
  evalFindFirstMock.mockReset();
  evalCreateMock.mockReset();
  evalUpdateMock.mockReset();
}

export function buildReviewerEmployee(overrides?: { id?: string; userId?: string }) {
  return {
    id: overrides?.id ?? "emp-reviewer-id",
    userId: overrides?.userId ?? "test-reviewer-user-id",
  };
}

export function buildRevieweeEmployee(reviewerId: string, overrides?: { id?: string }) {
  return {
    id: overrides?.id ?? "emp-reviewee-id",
    supervisorId: reviewerId,
  };
}

export function buildEvaluationRecord(overrides?: {
  id?: string;
  reviewerId?: string;
  revieweeId?: string;
  isSent?: boolean;
  sentAt?: Date | null;
  ackDeadline?: Date | null;
}) {
  return {
    id: overrides?.id ?? "eval-001",
    reviewerId: overrides?.reviewerId ?? "emp-reviewer-id",
    revieweeId: overrides?.revieweeId ?? "emp-reviewee-id",
    evaluationPeriod: "Q1 2026",
    grade: 4,
    highlights: null,
    lowlights: null,
    evaluation: null,
    recommendation: null,
    supportingDocUrl: null,
    isSent: overrides?.isSent ?? false,
    sentAt: overrides?.sentAt ?? null,
    ackDeadline: overrides?.ackDeadline ?? null,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
