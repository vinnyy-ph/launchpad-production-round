import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../core/database/prisma.service";
import {
  buildSurveyDetail,
  resetSurveyMocks,
  surveyFindFirstMock,
} from "./surveys-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-hr-user-id", role: "HR" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    teamMember: {
      findMany: jest.fn(),
    },
    pulseSurvey: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    surveyReminderConfig: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    surveyQuestion: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    surveyAudienceConfig: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    surveyOccurrence: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const occurrenceFindManyMock = prisma.surveyOccurrence.findMany as jest.Mock;
const occurrenceCountMock = prisma.surveyOccurrence.count as jest.Mock;

const URL = "/api/v1/pulse/surveys";

describe("GET /api/v1/pulse/surveys/:id/occurrences", () => {
  beforeEach(() => {
    resetSurveyMocks();
    occurrenceFindManyMock.mockReset();
    occurrenceCountMock.mockReset();
  });

  it("returns 403 for non-HR roles", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    authMock.authenticate.mockImplementationOnce(
      (req: any, _res: unknown, next: () => void) => {
        req.user = { id: "test-employee-user-id", role: "EMPLOYEE" };
        next();
      },
    );

    const response = await request(app).get(`${URL}/survey-001/occurrences`).expect(403);
    expect(response.body).toMatchObject({ success: false });
  });

  it("returns 404 for unknown survey ID", async () => {
    surveyFindFirstMock.mockResolvedValue(null);

    const response = await request(app).get(`${URL}/nonexistent-id/occurrences`).expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Pulse survey not found",
      errorCode: "SURVEY_NOT_FOUND",
    });
  });

  it("returns empty list when no occurrences exist", async () => {
    const survey = buildSurveyDetail({ id: "survey-001" });
    surveyFindFirstMock.mockResolvedValue(survey);

    occurrenceFindManyMock.mockResolvedValue([]);
    occurrenceCountMock.mockResolvedValue(0);

    const response = await request(app).get(`${URL}/${survey.id}/occurrences`).expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it("returns correct audienceSize and completionCount", async () => {
    const survey = buildSurveyDetail({ id: "survey-001" });
    surveyFindFirstMock.mockResolvedValue(survey);

    const occurrences = [
      {
        id: "occ-1",
        occurrenceNumber: 1,
        releaseDate: new Date("2026-06-18T00:00:00.000Z"),
        deadline: new Date("2026-06-19T00:00:00.000Z"),
        isClosed: false,
        _count: {
          audienceMembers: 5,
          completions: 2,
        },
      },
    ];

    occurrenceFindManyMock.mockResolvedValue(occurrences);
    occurrenceCountMock.mockResolvedValue(1);

    const response = await request(app).get(`${URL}/${survey.id}/occurrences`).expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Pulse survey occurrences retrieved successfully",
      data: [
        {
          id: "occ-1",
          occurrenceNumber: 1,
          releaseDate: "2026-06-18T00:00:00.000Z",
          deadline: "2026-06-19T00:00:00.000Z",
          isClosed: false,
          audienceSize: 5,
          completionCount: 2,
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it("pagination works", async () => {
    const survey = buildSurveyDetail({ id: "survey-001" });
    surveyFindFirstMock.mockResolvedValue(survey);

    const occurrences = [
      {
        id: "occ-2",
        occurrenceNumber: 2,
        releaseDate: new Date("2026-06-18T00:00:00.000Z"),
        deadline: new Date("2026-06-19T00:00:00.000Z"),
        isClosed: false,
        _count: {
          audienceMembers: 10,
          completions: 8,
        },
      },
    ];

    occurrenceFindManyMock.mockResolvedValue(occurrences);
    occurrenceCountMock.mockResolvedValue(3);

    const response = await request(app)
      .get(`${URL}/${survey.id}/occurrences?page=2&limit=1`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: [
        {
          id: "occ-2",
          occurrenceNumber: 2,
          audienceSize: 10,
          completionCount: 8,
        },
      ],
      meta: {
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
      },
    });

    expect(occurrenceFindManyMock).toHaveBeenCalledWith({
      where: { surveyId: survey.id },
      orderBy: { occurrenceNumber: "asc" },
      skip: 1,
      take: 1,
      select: expect.any(Object),
    });
  });
});
