import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../core/database/prisma.service";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-employee-user-id", role: "EMPLOYEE" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findUnique: jest.fn(),
    },
    surveyAudienceMember: {
      findMany: jest.fn(),
    },
    surveyCompletion: {
      findMany: jest.fn(),
    },
    // Read by the lazy occurrence scheduler invoked at the start of getPendingSurveys.
    pulseSurvey: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

const employeeFindUniqueMock = prisma.employee.findUnique as jest.Mock;
const audienceMemberFindManyMock = prisma.surveyAudienceMember.findMany as jest.Mock;
const completionFindManyMock = prisma.surveyCompletion.findMany as jest.Mock;

const URL = "/api/v1/pulse/me/surveys";

describe("GET /api/v1/pulse/me/surveys", () => {
  beforeEach(() => {
    employeeFindUniqueMock.mockReset();
    audienceMemberFindManyMock.mockReset();
  });

  it("returns 403 if user has no employee record", async () => {
    employeeFindUniqueMock.mockResolvedValue(null);

    const response = await request(app).get(URL).expect(403);

    expect(response.body).toMatchObject({
      success: false,
      message: "Your account is not linked to an employee record",
      errorCode: "CREATOR_NOT_EMPLOYEE",
    });
  });

  it("returns empty list if no pending occurrences", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1" });
    audienceMemberFindManyMock.mockResolvedValue([]);

    const response = await request(app).get(URL).expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: [],
    });
  });

  it("returns pending surveys with questions", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1" });

    const mockAudienceMembers = [
      {
        occurrence: {
          id: "occ-1",
          occurrenceNumber: 1,
          deadline: new Date("2026-06-19T00:00:00.000Z"),
          survey: {
            id: "survey-1",
            name: "Team Pulse Survey",
            questions: [
              {
                id: "q-1",
                surveyId: "survey-1",
                type: "SHORT_ANSWER",
                questionText: "How's work?",
                isRequired: true,
                options: null,
                scaleMin: null,
                scaleMax: null,
                scaleMinLabel: null,
                scaleMaxLabel: null,
                orderIndex: 1,
                createdAt: new Date("2026-06-18T00:00:00.000Z"),
                updatedAt: new Date("2026-06-18T00:00:00.000Z"),
              },
            ],
          },
        },
      },
    ];

    audienceMemberFindManyMock.mockResolvedValue(mockAudienceMembers);

    const response = await request(app).get(URL).expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Pending pulse surveys retrieved successfully",
      data: [
        {
          occurrenceId: "occ-1",
          surveyId: "survey-1",
          surveyName: "Team Pulse Survey",
          deadline: "2026-06-19T00:00:00.000Z",
          occurrenceNumber: 1,
          questions: [
            {
              id: "q-1",
              surveyId: "survey-1",
              type: "SHORT_ANSWER",
              questionText: "How's work?",
              isRequired: true,
            },
          ],
        },
      ],
    });

    expect(audienceMemberFindManyMock).toHaveBeenCalledWith({
      where: AmOrRegexMatchesEmployeeId("emp-1"),
      select: expect.any(Object),
    });
  });
});

describe("GET /api/v1/pulse/me/surveys/answered", () => {
  const ANSWERED_URL = `${URL}/answered`;

  beforeEach(() => {
    employeeFindUniqueMock.mockReset();
    completionFindManyMock.mockReset();
  });

  it("returns 403 if user has no employee record", async () => {
    employeeFindUniqueMock.mockResolvedValue(null);
    const response = await request(app).get(ANSWERED_URL).expect(403);
    expect(response.body).toMatchObject({ success: false, errorCode: "CREATOR_NOT_EMPLOYEE" });
  });

  it("returns empty list when nothing has been answered", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1" });
    completionFindManyMock.mockResolvedValue([]);
    const response = await request(app).get(ANSWERED_URL).expect(200);
    expect(response.body).toMatchObject({ success: true, data: [] });
  });

  it("maps completed pulses, most recent first", async () => {
    employeeFindUniqueMock.mockResolvedValue({ id: "emp-1" });
    completionFindManyMock.mockResolvedValue([
      {
        completedAt: new Date("2026-06-10T00:00:00.000Z"),
        occurrence: {
          id: "occ-9",
          occurrenceNumber: 2,
          survey: { id: "survey-1", name: "Weekly Pulse", isAnonymous: true },
        },
      },
    ]);

    const response = await request(app).get(ANSWERED_URL).expect(200);

    expect(response.body.data).toEqual([
      {
        occurrenceId: "occ-9",
        surveyId: "survey-1",
        surveyName: "Weekly Pulse",
        isAnonymous: true,
        occurrenceNumber: 2,
        completedAt: "2026-06-10T00:00:00.000Z",
      },
    ]);
    expect(completionFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: "emp-1" } }),
    );
  });
});

function AmOrRegexMatchesEmployeeId(expectedId: string) {
  return {
    employeeId: expectedId,
    occurrence: {
      isClosed: false,
      deadline: {
        gt: expect.any(Date),
      },
      completions: {
        none: {
          employeeId: expectedId,
        },
      },
    },
  };
}
