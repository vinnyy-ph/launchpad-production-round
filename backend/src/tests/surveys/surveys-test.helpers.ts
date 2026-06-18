import { prisma } from "../../core/database/prisma.service";

export const mockedPrisma = jest.mocked(prisma);

export const employeeFindUniqueMock = mockedPrisma.employee.findUnique as jest.Mock;
export const surveyTransactionMock = mockedPrisma.$transaction as jest.Mock;

export function resetSurveyMocks() {
  employeeFindUniqueMock.mockReset();
  surveyTransactionMock.mockReset();
}

export function buildHrEmployee(overrides?: { id?: string; userId?: string }) {
  return {
    id: overrides?.id ?? "emp-hr-id",
    userId: overrides?.userId ?? "test-hr-user-id",
  };
}

export function buildSurveyRecord(overrides?: {
  id?: string;
  createdBy?: string;
  name?: string;
  isActive?: boolean;
  isAnonymous?: boolean;
}) {
  return {
    id: overrides?.id ?? "survey-001",
    createdBy: overrides?.createdBy ?? "emp-hr-id",
    name: overrides?.name ?? "Test Pulse Survey",
    recurringType: "ONE_TIME" as const,
    audienceType: "EVERYONE" as const,
    isAnonymous: overrides?.isAnonymous ?? false,
    isActive: overrides?.isActive ?? false,
    visibility: "EVERYONE" as const,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    questions: [
      {
        id: "q-001",
        surveyId: "survey-001",
        type: "SHORT_ANSWER" as const,
        questionText: "How are you?",
        isRequired: true,
        options: null,
        scaleMin: null,
        scaleMax: null,
        scaleMinLabel: null,
        scaleMaxLabel: null,
        orderIndex: 1,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
    audienceConfigs: [],
    reminderConfig: null,
  };
}

export const VALID_BODY = {
  name: "Test Pulse Survey",
  questions: [
    { type: "SHORT_ANSWER", questionText: "How are you?", orderIndex: 1 },
  ],
};
