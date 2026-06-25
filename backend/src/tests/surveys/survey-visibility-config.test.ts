import request from "supertest";
import { app } from "../../app";
import {
  buildHrEmployee,
  buildSurveyRecord,
  buildSurveyDetail,
  employeeFindUniqueMock,
  resetSurveyMocks,
  surveyFindFirstMock,
  surveyTransactionMock,
  VALID_BODY,
} from "./surveys-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-hr-user-id", role: "HR" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn() },
    pulseSurvey: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const URL = "/api/v1/pulse/surveys";

describe("Survey visibility configs (SPECIFIC_TEAMS results visibility)", () => {
  beforeEach(() => {
    resetSurveyMocks();
  });

  // ─── Create: validation ──────────────────────────────────────────────────

  it("returns 400 when visibility=SPECIFIC_TEAMS but no visibilityConfigs are provided", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, visibility: "SPECIFIC_TEAMS" })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/at least one teamId when visibility is SPECIFIC_TEAMS/);
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when visibility=SPECIFIC_TEAMS but visibilityConfigs is empty", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, visibility: "SPECIFIC_TEAMS", visibilityConfigs: [] })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/at least one teamId when visibility is SPECIFIC_TEAMS/);
  });

  it("returns 400 when a visibilityConfig entry has no teamId", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, visibility: "SPECIFIC_TEAMS", visibilityConfigs: [{}] })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/teamId/);
  });

  // ─── Create: persistence ─────────────────────────────────────────────────

  it("persists visibilityConfigs when visibility=SPECIFIC_TEAMS", async () => {
    const hr = buildHrEmployee();
    const survey = {
      ...buildSurveyRecord({ createdBy: hr.id }),
      visibility: "SPECIFIC_TEAMS" as const,
      visibilityConfigs: [
        {
          id: "vc-001",
          surveyId: "survey-001",
          teamId: "team-1",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    };

    const visibilityCreateMany = jest.fn().mockResolvedValue({ count: 1 });
    employeeFindUniqueMock.mockResolvedValue(hr);
    surveyTransactionMock.mockImplementation(async (fn: Function) =>
      fn({
        pulseSurvey: {
          create: jest.fn().mockResolvedValue({ id: survey.id }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(survey),
        },
        surveyQuestion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
        surveyAudienceConfig: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
        surveyVisibilityConfig: { createMany: visibilityCreateMany },
        surveyReminderConfig: { create: jest.fn() },
      }),
    );

    const response = await request(app)
      .post(URL)
      .send({
        ...VALID_BODY,
        visibility: "SPECIFIC_TEAMS",
        visibilityConfigs: [{ teamId: "team-1" }],
      })
      .expect(201);

    expect(visibilityCreateMany).toHaveBeenCalledWith({
      data: [{ surveyId: survey.id, teamId: "team-1" }],
    });
    expect(response.body.data.visibility).toBe("SPECIFIC_TEAMS");
    expect(response.body.data.visibilityConfigs).toHaveLength(1);
    expect(response.body.data.visibilityConfigs[0]).toMatchObject({ teamId: "team-1" });
  });

  it("ignores visibilityConfigs when visibility is not SPECIFIC_TEAMS", async () => {
    const hr = buildHrEmployee();
    const survey = buildSurveyRecord({ createdBy: hr.id });

    const visibilityCreateMany = jest.fn().mockResolvedValue({ count: 0 });
    employeeFindUniqueMock.mockResolvedValue(hr);
    surveyTransactionMock.mockImplementation(async (fn: Function) =>
      fn({
        pulseSurvey: {
          create: jest.fn().mockResolvedValue({ id: survey.id }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(survey),
        },
        surveyQuestion: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
        surveyAudienceConfig: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
        surveyVisibilityConfig: { createMany: visibilityCreateMany },
        surveyReminderConfig: { create: jest.fn() },
      }),
    );

    await request(app)
      .post(URL)
      .send({ ...VALID_BODY, visibility: "EVERYONE", visibilityConfigs: [{ teamId: "team-1" }] })
      .expect(201);

    expect(visibilityCreateMany).not.toHaveBeenCalled();
  });

  // ─── Update ──────────────────────────────────────────────────────────────

  it("returns 400 when changing visibility to SPECIFIC_TEAMS without visibilityConfigs", async () => {
    const survey = buildSurveyDetail({ occurrenceCount: 0 }); // visibility EVERYONE, no configs
    surveyFindFirstMock.mockResolvedValueOnce(survey);

    const response = await request(app)
      .patch(`${URL}/${survey.id}`)
      .send({ visibility: "SPECIFIC_TEAMS" })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/at least one teamId when visibility is SPECIFIC_TEAMS/);
    expect(surveyTransactionMock).not.toHaveBeenCalled();
  });

  it("replaces visibilityConfigs when provided on update", async () => {
    const survey = buildSurveyDetail({ occurrenceCount: 0 });
    surveyFindFirstMock.mockResolvedValueOnce(survey);

    const updatedSurvey = {
      ...survey,
      visibility: "SPECIFIC_TEAMS",
      visibilityConfigs: [
        {
          id: "vc-002",
          surveyId: survey.id,
          teamId: "team-9",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const txMock = {
      pulseSurvey: {
        update: jest.fn().mockResolvedValue(updatedSurvey),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedSurvey),
      },
      surveyVisibilityConfig: { deleteMany, createMany },
    };
    surveyTransactionMock.mockImplementationOnce(async (fn: Function) => fn(txMock));

    const response = await request(app)
      .patch(`${URL}/${survey.id}`)
      .send({ visibility: "SPECIFIC_TEAMS", visibilityConfigs: [{ teamId: "team-9" }] })
      .expect(200);

    expect(deleteMany).toHaveBeenCalledWith({ where: { surveyId: survey.id } });
    expect(createMany).toHaveBeenCalledWith({
      data: [{ surveyId: survey.id, teamId: "team-9" }],
    });
    expect(response.body.data.visibilityConfigs).toHaveLength(1);
    expect(response.body.data.visibilityConfigs[0]).toMatchObject({ teamId: "team-9" });
  });
});
