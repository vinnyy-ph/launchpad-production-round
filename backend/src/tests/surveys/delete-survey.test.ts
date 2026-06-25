import request from "supertest";
import { app } from "../../app";
import {
  buildSurveyDetail,
  resetSurveyMocks,
  surveyFindFirstMock,
  surveyUpdateMock,
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
    pulseSurvey: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const URL = "/api/v1/pulse/surveys";

describe("DELETE /api/v1/pulse/surveys/:id", () => {
  beforeEach(() => {
    resetSurveyMocks();
  });

  it("returns 403 for non-HR roles", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    authMock.authenticate.mockImplementationOnce(
      (req: any, _res: unknown, next: () => void) => {
        req.user = { id: "test-employee-user-id", role: "EMPLOYEE" };
        next();
      },
    );

    const response = await request(app).delete(`${URL}/survey-001`).expect(403);
    expect(response.body).toMatchObject({ success: false });
  });

  it("returns 404 for unknown survey ID", async () => {
    surveyFindFirstMock.mockResolvedValue(null);

    const response = await request(app).delete(`${URL}/nonexistent-id`).expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Pulse survey not found",
      errorCode: "SURVEY_NOT_FOUND",
    });
  });

  it("returns 409 when trying to delete an active survey (isActive: true)", async () => {
    const survey = buildSurveyDetail({ isActive: true, occurrenceCount: 0 });
    surveyFindFirstMock.mockResolvedValue(survey);

    const response = await request(app).delete(`${URL}/${survey.id}`).expect(409);

    expect(response.body).toMatchObject({
      success: false,
      message: "Survey is already activated and cannot be modified or deleted",
      errorCode: "SURVEY_ALREADY_ACTIVATED",
    });
  });

  it("returns 409 when trying to delete a survey with occurrences", async () => {
    const survey = buildSurveyDetail({ isActive: false, occurrenceCount: 1 });
    surveyFindFirstMock.mockResolvedValue(survey);

    const response = await request(app).delete(`${URL}/${survey.id}`).expect(409);

    expect(response.body).toMatchObject({
      success: false,
      message: "Survey is already activated and cannot be modified or deleted",
      errorCode: "SURVEY_ALREADY_ACTIVATED",
    });
  });

  it("successfully soft-deletes a draft survey and returns 204 No Content", async () => {
    const survey = buildSurveyDetail({ isActive: false, occurrenceCount: 0 });
    surveyFindFirstMock.mockResolvedValue(survey);
    surveyUpdateMock.mockResolvedValue({ ...survey, deletedAt: new Date() });

    await request(app).delete(`${URL}/${survey.id}`).expect(204);

    expect(surveyFindFirstMock).toHaveBeenCalledWith({
      where: { id: survey.id, deletedAt: null },
      include: expect.any(Object),
    });

    expect(surveyUpdateMock).toHaveBeenCalledWith({
      where: { id: survey.id },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
