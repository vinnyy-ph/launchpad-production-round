import request from "supertest";
import { app } from "../../app";
import {
  buildSurveyDetail,
  resetSurveyMocks,
  surveyFindUniqueMock,
  surveyTransactionMock,
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
    pulseSurvey: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    surveyReminderConfig: { deleteMany: jest.fn(), upsert: jest.fn() },
    surveyQuestion: { deleteMany: jest.fn(), createMany: jest.fn() },
    surveyAudienceConfig: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const URL = "/api/v1/pulse/surveys";

describe("PATCH /api/v1/pulse/surveys/:surveyId", () => {
  beforeEach(() => {
    resetSurveyMocks();
  });

  // ─── Auth & Role ───────────────────────────────────────────────────────────

  it("returns 403 for non-HR roles", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (req: any, _res: unknown, next: () => void) => {
        req.user = { id: "test-employee-user-id", role: "EMPLOYEE" };
        next();
      },
    );

    const response = await request(app)
      .patch(`${URL}/survey-001`)
      .send({ name: "New Name" })
      .expect(403);

    expect(response.body).toMatchObject({ success: false });
  });

  // ─── Not Found ─────────────────────────────────────────────────────────────

  it("returns 404 for unknown survey ID", async () => {
    surveyFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`${URL}/nonexistent-id`)
      .send({ name: "New Name" })
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Pulse survey not found",
      errorCode: "SURVEY_NOT_FOUND",
    });
  });

  // ─── Guard Checks ──────────────────────────────────────────────────────────

  it("returns 409 when trying to update questions / audienceType / isAnonymous / recurringType on a survey that has occurrences", async () => {
    const survey = buildSurveyDetail({ occurrenceCount: 1 });
    surveyFindUniqueMock.mockResolvedValueOnce(survey);

    const guardedPayloads = [
      { questions: [{ type: "SHORT_ANSWER", questionText: "New Question", orderIndex: 1 }] },
      { audienceType: "SUPERVISOR_BASED" },
      { audienceConfigs: [{ teamId: "team-123" }] },
      { isAnonymous: true },
      { recurringType: "WEEKLY" },
    ];

    for (const payload of guardedPayloads) {
      surveyFindUniqueMock.mockResolvedValueOnce(survey);
      const response = await request(app)
        .patch(`${URL}/${survey.id}`)
        .send(payload);

      if (response.status !== 409) {
        console.log("GUARDED PAYLOAD FAILURE:", payload, "STATUS:", response.status, "BODY:", response.body);
      }
      expect(response.status).toBe(409);

      expect(response.body).toMatchObject({
        success: false,
        message: "Cannot update questions, audienceType, audienceConfigs, isAnonymous, or recurringType after it has been activated",
        errorCode: "SURVEY_ALREADY_ACTIVATED",
      });
    }
  });

  // ─── Success Path ──────────────────────────────────────────────────────────

  it("updates name successfully on an active survey", async () => {
    const survey = buildSurveyDetail({ name: "Old Name", isActive: true, occurrenceCount: 2 });
    surveyFindUniqueMock.mockResolvedValueOnce(survey);

    const updatedSurvey = { ...survey, name: "New Name" };
    const txMock = {
      pulseSurvey: {
        update: jest.fn().mockResolvedValue(updatedSurvey),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedSurvey),
      },
    };
    surveyTransactionMock.mockImplementationOnce(async (fn: Function) => fn(txMock));

    const response = await request(app)
      .patch(`${URL}/${survey.id}`)
      .send({ name: "New Name" })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Resource updated successfully",
      data: {
        name: "New Name",
      },
    });

    expect(txMock.pulseSurvey.update).toHaveBeenCalledWith({
      where: { id: survey.id },
      data: { name: "New Name" },
    });
  });

  it("updates questions successfully on a draft (no occurrences)", async () => {
    const survey = buildSurveyDetail({ isActive: false, occurrenceCount: 0 });
    surveyFindUniqueMock.mockResolvedValueOnce(survey);

    const updatedSurvey = { ...survey };
    const txMock = {
      pulseSurvey: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedSurvey),
      },
      surveyQuestion: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    surveyTransactionMock.mockImplementationOnce(async (fn: Function) => fn(txMock));

    const response = await request(app)
      .patch(`${URL}/${survey.id}`)
      .send({
        questions: [{ type: "SHORT_ANSWER", questionText: "New Question", orderIndex: 1 }],
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(txMock.surveyQuestion.deleteMany).toHaveBeenCalledWith({ where: { surveyId: survey.id } });
    expect(txMock.surveyQuestion.createMany).toHaveBeenCalled();
  });

  it("updating reminderConfig to null removes it", async () => {
    const survey = buildSurveyDetail({ occurrenceCount: 0 });
    surveyFindUniqueMock.mockResolvedValueOnce(survey);

    const updatedSurvey = { ...survey, reminderConfig: null };
    const txMock = {
      surveyReminderConfig: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      pulseSurvey: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedSurvey),
      },
    };
    surveyTransactionMock.mockImplementationOnce(async (fn: Function) => fn(txMock));

    const response = await request(app)
      .patch(`${URL}/${survey.id}`)
      .send({ reminderConfig: null })
      .expect(200);

    expect(response.body.data.reminderConfig).toBeNull();
    expect(txMock.surveyReminderConfig.deleteMany).toHaveBeenCalledWith({ where: { surveyId: survey.id } });
  });

  it("upserts reminderConfig correctly", async () => {
    const survey = buildSurveyDetail({ occurrenceCount: 0 });
    surveyFindUniqueMock.mockResolvedValueOnce(survey);

    const updatedSurvey = {
      ...survey,
      reminderConfig: {
        id: "rc-002",
        surveyId: survey.id,
        frequency: "DAILY",
        everyXDays: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    const txMock = {
      surveyReminderConfig: {
        upsert: jest.fn().mockResolvedValue(updatedSurvey.reminderConfig),
      },
      pulseSurvey: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedSurvey),
      },
    };
    surveyTransactionMock.mockImplementationOnce(async (fn: Function) => fn(txMock));

    const response = await request(app)
      .patch(`${URL}/${survey.id}`)
      .send({ reminderConfig: { frequency: "DAILY" } })
      .expect(200);

    expect(response.body.data.reminderConfig).toMatchObject({ frequency: "DAILY" });
    expect(txMock.surveyReminderConfig.upsert).toHaveBeenCalledWith({
      where: { surveyId: survey.id },
      update: { frequency: "DAILY", everyXDays: null },
      create: { surveyId: survey.id, frequency: "DAILY", everyXDays: null },
    });
  });
});
