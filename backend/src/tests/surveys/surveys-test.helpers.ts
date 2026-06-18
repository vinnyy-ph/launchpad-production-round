import { prisma } from "../../core/database/prisma.service";

export const mockedPrisma = jest.mocked(prisma);

export const employeeFindUniqueMock = mockedPrisma.employee.findUnique as jest.Mock;
export const surveyTransactionMock = mockedPrisma.$transaction as jest.Mock;
export const surveyFindManyMock = (mockedPrisma.pulseSurvey?.findMany ?? jest.fn()) as jest.Mock;
export const surveyCountMock = (mockedPrisma.pulseSurvey?.count ?? jest.fn()) as jest.Mock;
export const surveyFindUniqueMock = (mockedPrisma.pulseSurvey?.findUnique ?? jest.fn()) as jest.Mock;
export const surveyFindFirstMock = (mockedPrisma.pulseSurvey?.findFirst ?? jest.fn()) as jest.Mock;
export const surveyUpdateMock = (mockedPrisma.pulseSurvey?.update ?? jest.fn()) as jest.Mock;
export const surveyReminderConfigDeleteManyMock = (mockedPrisma.surveyReminderConfig?.deleteMany ?? jest.fn()) as jest.Mock;
export const surveyReminderConfigUpsertMock = (mockedPrisma.surveyReminderConfig?.upsert ?? jest.fn()) as jest.Mock;
export const surveyQuestionDeleteManyMock = (mockedPrisma.surveyQuestion?.deleteMany ?? jest.fn()) as jest.Mock;
export const surveyQuestionCreateManyMock = (mockedPrisma.surveyQuestion?.createMany ?? jest.fn()) as jest.Mock;
export const surveyAudienceConfigDeleteManyMock = (mockedPrisma.surveyAudienceConfig?.deleteMany ?? jest.fn()) as jest.Mock;
export const surveyAudienceConfigCreateManyMock = (mockedPrisma.surveyAudienceConfig?.createMany ?? jest.fn()) as jest.Mock;

export function resetSurveyMocks() {
  employeeFindUniqueMock.mockReset();
  surveyTransactionMock.mockReset();
  surveyFindManyMock.mockReset();
  surveyCountMock.mockReset();
  surveyFindUniqueMock.mockReset();
  surveyFindFirstMock.mockReset();
  surveyUpdateMock.mockReset();
  surveyReminderConfigDeleteManyMock.mockReset();
  surveyReminderConfigUpsertMock.mockReset();
  surveyQuestionDeleteManyMock.mockReset();
  surveyQuestionCreateManyMock.mockReset();
  surveyAudienceConfigDeleteManyMock.mockReset();
  surveyAudienceConfigCreateManyMock.mockReset();
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

/** Builds a list-item row with _count for the findMany mock. */
export function buildSurveyListItem(overrides?: {
  id?: string;
  name?: string;
  isActive?: boolean;
  occurrenceCount?: number;
}) {
  return {
    id: overrides?.id ?? "survey-001",
    createdBy: "emp-hr-id",
    name: overrides?.name ?? "Test Pulse Survey",
    recurringType: "ONE_TIME" as const,
    audienceType: "EVERYONE" as const,
    isAnonymous: false,
    isActive: overrides?.isActive ?? false,
    visibility: "EVERYONE" as const,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    _count: { occurrences: overrides?.occurrenceCount ?? 0 },
  };
}

/** Builds a full detail row for the findUnique mock (detail endpoint). */
export function buildSurveyDetail(overrides?: {
  id?: string;
  name?: string;
  isActive?: boolean;
  occurrenceCount?: number;
  hasReminderConfig?: boolean;
  releaseDate?: Date;
  deadline?: Date;
}) {
  return {
    id: overrides?.id ?? "survey-001",
    createdBy: "emp-hr-id",
    name: overrides?.name ?? "Test Pulse Survey",
    recurringType: "ONE_TIME" as const,
    audienceType: "EVERYONE" as const,
    isAnonymous: false,
    isActive: overrides?.isActive ?? false,
    visibility: "EVERYONE" as const,
    releaseDate: overrides?.releaseDate ?? new Date("2026-06-18T00:00:00.000Z"),
    deadline: overrides?.deadline ?? new Date("2026-06-19T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    _count: { occurrences: overrides?.occurrenceCount ?? 0 },
    questions: [
      {
        id: "q-001",
        surveyId: overrides?.id ?? "survey-001",
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
    visibilityConfigs: [],
    reminderConfig: overrides?.hasReminderConfig
      ? {
          id: "rc-001",
          surveyId: overrides?.id ?? "survey-001",
          frequency: "WEEKLY" as const,
          everyXDays: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }
      : null,
  };
}

export const VALID_BODY = {
  name: "Test Pulse Survey",
  releaseDate: "2026-06-18T00:00:00.000Z",
  deadline: "2026-06-19T00:00:00.000Z",
  questions: [
    { type: "SHORT_ANSWER", questionText: "How are you?", orderIndex: 1 },
  ],
};
