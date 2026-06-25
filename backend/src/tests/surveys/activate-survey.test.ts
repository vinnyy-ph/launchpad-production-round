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
    surveyOccurrence: {
      create: jest.fn(),
    },
    surveyAudienceMember: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../core/email", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
  })),
}));

const employeeFindManyMock = prisma.employee.findMany as jest.Mock;
const teamMemberFindManyMock = prisma.teamMember.findMany as jest.Mock;
const occurrenceCreateMock = prisma.surveyOccurrence.create as jest.Mock;
const audienceMemberCreateManyMock = prisma.surveyAudienceMember.createMany as jest.Mock;

const URL = "/api/v1/pulse/surveys";

describe("PATCH /api/v1/pulse/surveys/:id/activate", () => {
  beforeEach(() => {
    resetSurveyMocks();
    employeeFindManyMock.mockReset();
    teamMemberFindManyMock.mockReset();
    occurrenceCreateMock.mockReset();
    audienceMemberCreateManyMock.mockReset();

    // Default transaction implementation
    surveyTransactionMock.mockImplementation(async (cb: any) => {
      return cb({
        surveyOccurrence: { create: occurrenceCreateMock },
        surveyAudienceMember: { createMany: audienceMemberCreateManyMock },
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

    const response = await request(app).patch(`${URL}/survey-001/activate`).expect(403);
    expect(response.body).toMatchObject({ success: false });
  });

  it("returns 404 for unknown survey ID", async () => {
    surveyFindFirstMock.mockResolvedValue(null);

    const response = await request(app).patch(`${URL}/nonexistent-id/activate`).expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Pulse survey not found",
      errorCode: "SURVEY_NOT_FOUND",
    });
  });

  it("returns 409 when the survey is already active", async () => {
    const survey = buildSurveyDetail({ isActive: true, occurrenceCount: 0 });
    surveyFindFirstMock.mockResolvedValue(survey);

    const response = await request(app).patch(`${URL}/${survey.id}/activate`).expect(409);

    expect(response.body).toMatchObject({
      success: false,
      message: "Survey is already active",
      errorCode: "SURVEY_ALREADY_ACTIVE",
    });
  });

  it("returns 409 when the survey has already been activated before", async () => {
    const survey = buildSurveyDetail({ isActive: false, occurrenceCount: 1 });
    surveyFindFirstMock.mockResolvedValue(survey);

    const response = await request(app).patch(`${URL}/${survey.id}/activate`).expect(409);

    expect(response.body).toMatchObject({
      success: false,
      message: "Cannot update questions, audienceType, audienceConfigs, isAnonymous, or recurringType after it has been activated",
      errorCode: "SURVEY_ALREADY_ACTIVATED",
    });
  });

  it("returns 409 when the survey's start date is in the future", async () => {
    const survey = buildSurveyDetail({
      isActive: false,
      occurrenceCount: 0,
      releaseDate: new Date("2099-01-01T00:00:00.000Z"),
    });
    surveyFindFirstMock.mockResolvedValue(survey);

    const response = await request(app).patch(`${URL}/${survey.id}/activate`).expect(409);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "SURVEY_RELEASE_DATE_FUTURE",
    });

    // No occurrence created and no notifications/emails are sent.
    expect(occurrenceCreateMock).not.toHaveBeenCalled();
  });

  it("successfully activates a draft survey and snapshots target employees", async () => {
    const survey = buildSurveyDetail({ isActive: false, occurrenceCount: 0 });
    surveyFindFirstMock.mockResolvedValue(survey);

    // Mock employees for EVERYONE audienceType
    employeeFindManyMock.mockResolvedValue([
      { id: "emp-1" },
      { id: "emp-2" },
    ]);

    // Mock occurrence and audience creation
    occurrenceCreateMock.mockResolvedValue({ id: "occ-123" });
    audienceMemberCreateManyMock.mockResolvedValue({ count: 2 });
    surveyUpdateMock.mockResolvedValue({ ...survey, isActive: true });

    // Mock the findById call at the end of activate
    surveyFindFirstMock.mockResolvedValueOnce(survey); // first check
    surveyFindFirstMock.mockResolvedValueOnce({ ...survey, isActive: true, _count: { occurrences: 1 } }); // final detail fetch

    const response = await request(app).patch(`${URL}/${survey.id}/activate`).expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Pulse survey activated successfully");
    expect(response.body.data.isActive).toBe(true);

    expect(employeeFindManyMock).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    expect(occurrenceCreateMock).toHaveBeenCalledWith({
      data: {
        surveyId: survey.id,
        occurrenceNumber: 1,
        releaseDate: expect.any(Date),
        deadline: expect.any(Date),
        isClosed: false,
      },
    });

    expect(audienceMemberCreateManyMock).toHaveBeenCalledWith({
      data: [
        { occurrenceId: "occ-123", employeeId: "emp-1" },
        { occurrenceId: "occ-123", employeeId: "emp-2" },
      ],
    });

    expect(surveyUpdateMock).toHaveBeenCalledWith({
      where: { id: survey.id },
      data: { isActive: true },
    });
  });
});
