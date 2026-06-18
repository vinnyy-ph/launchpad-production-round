import request from "supertest";
import { app } from "../../app";
import {
  buildSurveyDetail,
  resetSurveyMocks,
  surveyFindUniqueMock,
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
    pulseSurvey: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const URL = "/api/v1/pulse/surveys";

describe("GET /api/v1/pulse/surveys/:surveyId", () => {
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

    const response = await request(app).get(`${URL}/survey-001`).expect(403);
    expect(response.body).toMatchObject({ success: false });
  });

  // ─── Not Found ─────────────────────────────────────────────────────────────

  it("returns 404 for unknown survey ID", async () => {
    surveyFindUniqueMock.mockResolvedValue(null);

    const response = await request(app).get(`${URL}/nonexistent-id`).expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Pulse survey not found",
      errorCode: "SURVEY_NOT_FOUND",
    });
  });

  // ─── Happy Path — Full Detail ─────────────────────────────────────────────

  it("returns full detail including questions, audienceConfigs, reminderConfig", async () => {
    const detail = buildSurveyDetail({ hasReminderConfig: true, occurrenceCount: 2 });
    surveyFindUniqueMock.mockResolvedValue(detail);

    const response = await request(app).get(`${URL}/${detail.id}`).expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: detail.id,
        name: detail.name,
        occurrenceCount: 2,
      },
    });

    expect(response.body.data.questions).toHaveLength(1);
    expect(response.body.data.questions[0]).toMatchObject({
      type: "SHORT_ANSWER",
      questionText: "How are you?",
    });
    expect(response.body.data.audienceConfigs).toEqual([]);
    expect(response.body.data.reminderConfig).toMatchObject({
      frequency: "WEEKLY",
    });
  });

  it("returns visibilityConfigs as an empty array", async () => {
    const detail = buildSurveyDetail();
    surveyFindUniqueMock.mockResolvedValue(detail);

    const response = await request(app).get(`${URL}/${detail.id}`).expect(200);

    expect(response.body.data.visibilityConfigs).toEqual([]);
  });

  it("returns visibilityConfigs as an empty array even when property is missing from DB row", async () => {
    const detail = buildSurveyDetail();
    // Simulate the case where visibilityConfigs relation is not included
    const { visibilityConfigs: _, ...detailWithoutVisibility } = detail as any;
    surveyFindUniqueMock.mockResolvedValue(detailWithoutVisibility);

    const response = await request(app).get(`${URL}/${detail.id}`).expect(200);

    expect(response.body.data.visibilityConfigs).toEqual([]);
  });

  it("returns correct occurrenceCount", async () => {
    const detail = buildSurveyDetail({ occurrenceCount: 7 });
    surveyFindUniqueMock.mockResolvedValue(detail);

    const response = await request(app).get(`${URL}/${detail.id}`).expect(200);

    expect(response.body.data.occurrenceCount).toBe(7);
  });

  it("returns null reminderConfig when survey has none", async () => {
    const detail = buildSurveyDetail({ hasReminderConfig: false });
    surveyFindUniqueMock.mockResolvedValue(detail);

    const response = await request(app).get(`${URL}/${detail.id}`).expect(200);

    expect(response.body.data.reminderConfig).toBeNull();
  });
});
