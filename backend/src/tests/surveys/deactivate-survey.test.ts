import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../core/database/prisma.service";
import {
  buildSurveyDetail,
  resetSurveyMocks,
  surveyFindFirstMock,
  surveyUpdateMock,
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
    pulseSurvey: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    surveyOccurrence: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const occurrenceFindFirstMock = prisma.surveyOccurrence.findFirst as jest.Mock;
const occurrenceUpdateMock = prisma.surveyOccurrence.update as jest.Mock;

const URL = "/api/v1/pulse/surveys";

describe("PATCH /api/v1/pulse/surveys/:id/deactivate", () => {
  beforeEach(() => {
    resetSurveyMocks();
    occurrenceFindFirstMock.mockReset();
    occurrenceUpdateMock.mockReset();

    // Default transaction implementation
    surveyTransactionMock.mockImplementation(async (cb: any) => {
      return cb({
        surveyOccurrence: { update: occurrenceUpdateMock },
        pulseSurvey: { update: surveyUpdateMock },
      });
    });
  });

  it("returns 403 for non-HR roles", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    authMock.authenticate.mockImplementationOnce(
      (req: any, _res: unknown, next: () => void) => {
        req.user = { id: "test-employee-user-id", role: "EMPLOYEE" };
        next();
      },
    );

    const response = await request(app).patch(`${URL}/survey-001/deactivate`).expect(403);
    expect(response.body).toMatchObject({ success: false });
  });

  it("returns 404 for unknown survey ID", async () => {
    surveyFindFirstMock.mockResolvedValue(null);

    const response = await request(app).patch(`${URL}/nonexistent-id/deactivate`).expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Pulse survey not found",
      errorCode: "SURVEY_NOT_FOUND",
    });
  });

  it("returns 409 when the survey is already inactive", async () => {
    const survey = buildSurveyDetail({ isActive: false, occurrenceCount: 1 });
    surveyFindFirstMock.mockResolvedValue(survey);

    const response = await request(app).patch(`${URL}/${survey.id}/deactivate`).expect(409);

    expect(response.body).toMatchObject({
      success: false,
      message: "Survey is already inactive",
      errorCode: "SURVEY_ALREADY_INACTIVE",
    });
  });

  it("successfully deactivates an active survey and closes open occurrence", async () => {
    const survey = buildSurveyDetail({ isActive: true, occurrenceCount: 1 });

    // Mock open occurrence
    occurrenceFindFirstMock.mockResolvedValue({ id: "occ-123", isClosed: false });

    // Mock update calls
    occurrenceUpdateMock.mockResolvedValue({ id: "occ-123", isClosed: true });
    surveyUpdateMock.mockResolvedValue({ ...survey, isActive: false });

    // Mock findById details fetch (first call for existence check, second call for final response)
    surveyFindFirstMock.mockResolvedValueOnce(survey);
    surveyFindFirstMock.mockResolvedValueOnce({ ...survey, isActive: false });

    const response = await request(app).patch(`${URL}/${survey.id}/deactivate`).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Pulse survey deactivated successfully");
    expect(response.body.data.isActive).toBe(false);

    expect(occurrenceFindFirstMock).toHaveBeenCalledWith({
      where: {
        surveyId: survey.id,
        isClosed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    expect(occurrenceUpdateMock).toHaveBeenCalledWith({
      where: { id: "occ-123" },
      data: { isClosed: true },
    });

    expect(surveyUpdateMock).toHaveBeenCalledWith({
      where: { id: survey.id },
      data: { isActive: false },
    });
  });
});
