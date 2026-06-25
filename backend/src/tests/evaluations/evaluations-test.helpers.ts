import { prisma } from "../../core/database/prisma.service";

export const mockedPrisma = jest.mocked(prisma);

export const employeeFindUniqueMock = mockedPrisma.employee.findUnique as jest.Mock;
export const evalFindManyMock = mockedPrisma.performanceEvaluation.findMany as jest.Mock;
export const evalCountMock = mockedPrisma.performanceEvaluation.count as jest.Mock;
export const evalFindFirstMock = mockedPrisma.performanceEvaluation.findFirst as jest.Mock;
export const evalCreateMock = mockedPrisma.performanceEvaluation.create as jest.Mock;
export const evalUpdateMock = mockedPrisma.performanceEvaluation.update as jest.Mock;
export const evalAcknowledgementCreateMock = mockedPrisma.evaluationAcknowledgement.create as jest.Mock;
export const evalAcknowledgementUpdateMock = mockedPrisma.evaluationAcknowledgement.update as jest.Mock;
export const transactionMock = mockedPrisma.$transaction as jest.Mock;

export function resetEvaluationMocks() {
  employeeFindUniqueMock.mockReset();
  evalFindManyMock.mockReset();
  evalCountMock.mockReset();
  evalFindFirstMock.mockReset();
  evalCreateMock.mockReset();
  evalUpdateMock.mockReset();
  evalAcknowledgementCreateMock.mockReset();
  evalAcknowledgementUpdateMock.mockReset();
  transactionMock.mockReset();
  // Default: interactive $transaction passes through to the mocked prisma client
  transactionMock.mockImplementation((fn: (tx: typeof prisma) => Promise<unknown>) =>
    typeof fn === "function" ? fn(mockedPrisma) : Promise.all(fn),
  );
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
  acknowledgement?: { isDeemedAck: boolean; acknowledgedAt: Date | null } | null;
}) {
  return {
    id: overrides?.id ?? "eval-001",
    reviewerId: overrides?.reviewerId ?? "emp-reviewer-id",
    revieweeId: overrides?.revieweeId ?? "emp-reviewee-id",
    reviewee: { id: overrides?.revieweeId ?? "emp-reviewee-id", firstName: "Test", lastName: "Reviewee" },
    periodStart: new Date("2026-01-01T00:00:00.000Z"),
    periodEnd: new Date("2026-03-31T00:00:00.000Z"),
    grade: 4,
    highlights: [],
    lowlights: [],
    evaluation: null,
    recommendation: null,
    supportingDocs: [],
    isSent: overrides?.isSent ?? false,
    sentAt: overrides?.sentAt ?? null,
    ackDeadline: overrides?.ackDeadline ?? null,
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    acknowledgement: overrides?.acknowledgement !== undefined ? overrides.acknowledgement : null,
  };
}
