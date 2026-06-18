import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../core/database/prisma.service";
import { createOrgChains } from "../../modules/shared/org/chains";

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
    surveyOccurrence: { findUnique: jest.fn() },
    surveyResponse: { findMany: jest.fn() },
    surveyAudienceMember: { findMany: jest.fn() },
  },
}));

jest.mock("../../modules/shared/org/chains", () => ({
  createOrgChains: jest.fn(() => ({
    downwardChain: jest.fn().mockResolvedValue([]),
  })),
}));

const URL = "/api/v1/pulse/surveys";

describe("GET /api/v1/pulse/surveys/:id/results", () => {
  const employeeFindMock = prisma.employee.findUnique as jest.Mock;
  const surveyFindFirstMock = prisma.pulseSurvey.findFirst as jest.Mock;
  const surveyResponseFindManyMock = prisma.surveyResponse.findMany as jest.Mock;
  const surveyAudienceFindManyMock = prisma.surveyAudienceMember.findMany as jest.Mock;
  const mockCreateOrgChains = createOrgChains as jest.Mock;

  const authMock = jest.requireMock("../../core/middleware/auth.middleware");

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to HR auth
    authMock.authenticate.mockImplementation((req: any, _res: any, next: any) => {
      req.user = { id: "test-hr-user-id", role: "HR" };
      next();
    });
  });

  const setAuthUser = (user: { id: string; role: string }) => {
    authMock.authenticate.mockImplementation((req: any, _res: any, next: any) => {
      req.user = user;
      next();
    });
  };

  const mockSurvey = (overrides?: any) => {
    return {
      id: "survey-001",
      name: "Test Survey",
      visibility: "EVERYONE",
      isAnonymous: false,
      questions: [
        { id: "q-1", type: "SHORT_ANSWER", questionText: "Text Q", orderIndex: 1 },
        { id: "q-2", type: "LINEAR_SCALE", questionText: "Scale Q", scaleMin: 1, scaleMax: 5, orderIndex: 2 },
        { id: "q-3", type: "MULTIPLE_CHOICE", questionText: "MC Q", options: ["A", "B"], orderIndex: 3 },
        { id: "q-4", type: "CHECKBOX", questionText: "CB Q", options: ["X", "Y"], orderIndex: 4 },
      ],
      audienceConfigs: [],
      visibilityConfigs: [],
      ...overrides,
    };
  };

  it("returns 404 for unknown survey ID", async () => {
    surveyFindFirstMock.mockResolvedValue(null);
    const response = await request(app).get(`${URL}/nonexistent/results`).expect(404);
    expect(response.body).toMatchObject({
      success: false,
      message: "Survey not found",
    });
  });

  it("returns 400 when both teamId and supervisorId are provided", async () => {
    const s = mockSurvey();
    surveyFindFirstMock.mockResolvedValue(s);

    const response = await request(app)
      .get(`${URL}/survey-001/results?teamId=team-1&supervisorId=emp-1`)
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Only one of teamId or supervisorId may be provided",
    });
  });

  it("returns 403 for non-HR when visibility = HR_ROOT_ONLY and user has a supervisor", async () => {
    const s = mockSurvey({ visibility: "HR_ROOT_ONLY" });
    surveyFindFirstMock.mockResolvedValue(s);

    employeeFindMock.mockResolvedValue({
      id: "emp-1",
      userId: "test-user-id",
      supervisorId: "supervisor-id",
      teamMemberships: [],
    });

    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

    const response = await request(app).get(`${URL}/survey-001/results`).expect(403);
    expect(response.body).toMatchObject({
      success: false,
      message: "You do not have permission to view results",
    });
  });

  it("returns 200 for root node employee when visibility = HR_ROOT_ONLY", async () => {
    const s = mockSurvey({ visibility: "HR_ROOT_ONLY" });
    surveyFindFirstMock.mockResolvedValue(s);

    employeeFindMock.mockResolvedValue({
      id: "emp-1",
      userId: "test-user-id",
      supervisorId: null,
      teamMemberships: [],
    });

    surveyResponseFindManyMock.mockResolvedValue([]);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

    await request(app).get(`${URL}/survey-001/results`).expect(200);
  });

  it("returns 403 for employee outside the visibility scope (SPECIFIC_TEAMS)", async () => {
    const s = mockSurvey({
      visibility: "SPECIFIC_TEAMS",
      visibilityConfigs: [{ teamId: "team-allowed" }],
    });
    surveyFindFirstMock.mockResolvedValue(s);

    employeeFindMock.mockResolvedValue({
      id: "emp-1",
      userId: "test-user-id",
      supervisorId: "supervisor-id",
      teamMemberships: [{ teamId: "team-other" }],
    });

    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

    const response = await request(app).get(`${URL}/survey-001/results`).expect(403);
    expect(response.body).toMatchObject({
      success: false,
    });
  });

  it("returns 200 for employee inside the visibility scope (SPECIFIC_TEAMS)", async () => {
    const s = mockSurvey({
      visibility: "SPECIFIC_TEAMS",
      visibilityConfigs: [{ teamId: "team-allowed" }],
    });
    surveyFindFirstMock.mockResolvedValue(s);

    employeeFindMock.mockResolvedValue({
      id: "emp-1",
      userId: "test-user-id",
      supervisorId: "supervisor-id",
      teamMemberships: [{ teamId: "team-allowed" }],
    });

    surveyResponseFindManyMock.mockResolvedValue([]);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

    await request(app).get(`${URL}/survey-001/results`).expect(200);
  });

  it("HR always sees results regardless of visibility setting", async () => {
    const s = mockSurvey({ visibility: "HR_ROOT_ONLY" });
    surveyFindFirstMock.mockResolvedValue(s);
    surveyResponseFindManyMock.mockResolvedValue([]);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    // Caller is HR
    await request(app).get(`${URL}/survey-001/results`).expect(200);
  });

  it("returns correct aggregation for each question type", async () => {
    const s = mockSurvey();
    surveyFindFirstMock.mockResolvedValue(s);

    const responses = [
      {
        id: "res-1",
        answers: [
          { questionId: "q-1", answerText: "Good", answerData: null },
          { questionId: "q-2", answerText: null, answerData: 4 },
          { questionId: "q-3", answerText: null, answerData: "A" },
          { questionId: "q-4", answerText: null, answerData: ["X"] },
        ],
      },
      {
        id: "res-2",
        answers: [
          { questionId: "q-1", answerText: "Fine", answerData: null },
          { questionId: "q-2", answerText: null, answerData: 2 },
          { questionId: "q-3", answerText: null, answerData: "B" },
          { questionId: "q-4", answerText: null, answerData: ["X", "Y"] },
        ],
      },
    ];

    surveyResponseFindManyMock.mockResolvedValue(responses);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    const response = await request(app).get(`${URL}/survey-001/results`).expect(200);

    expect(response.body.success).toBe(true);
    const qs = response.body.data.questions;
    expect(qs).toHaveLength(4);

    // SHORT_ANSWER
    expect(qs[0]).toMatchObject({
      questionId: "q-1",
      type: "SHORT_ANSWER",
      responseCount: 2,
      responses: ["Good", "Fine"],
    });

    // LINEAR_SCALE
    expect(qs[1]).toMatchObject({
      questionId: "q-2",
      type: "LINEAR_SCALE",
      responseCount: 2,
      average: 3,
      min: 2,
      max: 4,
      distribution: { "1": 0, "2": 1, "3": 0, "4": 1, "5": 0 },
    });

    // MULTIPLE_CHOICE
    expect(qs[2]).toMatchObject({
      questionId: "q-3",
      type: "MULTIPLE_CHOICE",
      responseCount: 2,
      counts: { A: 1, B: 1 },
    });

    // CHECKBOX
    expect(qs[3]).toMatchObject({
      questionId: "q-4",
      type: "CHECKBOX",
      responseCount: 2,
      counts: { X: 2, Y: 1 },
    });
  });

  it("hides individual SHORT_ANSWER text when isAnonymous = true (at/above the min-group threshold)", async () => {
    const s = mockSurvey({ isAnonymous: true });
    surveyFindFirstMock.mockResolvedValue(s);

    // 3 responses → at/above MIN_GROUP, so the breakdown shows, but anonymous free text is withheld.
    const responses = [
      { id: "res-1", answers: [{ questionId: "q-1", answerText: "Feedback one", answerData: null }] },
      { id: "res-2", answers: [{ questionId: "q-1", answerText: "Feedback two", answerData: null }] },
      { id: "res-3", answers: [{ questionId: "q-1", answerText: "Feedback three", answerData: null }] },
    ];
    surveyResponseFindManyMock.mockResolvedValue(responses);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    const response = await request(app).get(`${URL}/survey-001/results`).expect(200);

    expect(response.body.data.suppressed).toBe(false);
    expect(response.body.data.questions[0]).toMatchObject({
      questionId: "q-1",
      responseCount: 3,
      responses: [],
    });
  });

  it("suppresses the TOP-LEVEL (unfiltered) view of an anonymous survey with fewer than 3 responses", async () => {
    const s = mockSurvey({ isAnonymous: true });
    surveyFindFirstMock.mockResolvedValue(s);

    // 2 responses, NO filter — must still be suppressed; the min-group rule applies to every view,
    // not only filtered ones. (Regression guard for the top-level anonymity leak.)
    surveyResponseFindManyMock.mockResolvedValue([
      { id: "res-1", answers: [{ questionId: "q-1", answerText: "a", answerData: null }] },
      { id: "res-2", answers: [{ questionId: "q-1", answerText: "b", answerData: null }] },
    ]);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    const response = await request(app).get(`${URL}/survey-001/results`).expect(200);

    expect(response.body.data).toMatchObject({ suppressed: true, questions: [] });
  });

  it("does NOT suppress a non-anonymous survey with fewer than 3 responses", async () => {
    const s = mockSurvey({ isAnonymous: false });
    surveyFindFirstMock.mockResolvedValue(s);

    surveyResponseFindManyMock.mockResolvedValue([
      { id: "res-1", answers: [{ questionId: "q-1", answerText: "a", answerData: null }] },
    ]);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    const response = await request(app).get(`${URL}/survey-001/results`).expect(200);

    expect(response.body.data.suppressed).toBe(false);
    expect(response.body.data.questions.length).toBeGreaterThan(0);
  });

  it("returns { suppressed: true, questions: [] } when filtered group has fewer than 3 responses", async () => {
    const s = mockSurvey({ isAnonymous: true });
    surveyFindFirstMock.mockResolvedValue(s);

    // Only 2 responses match the filter
    const responses = [
      {
        id: "res-1",
        answers: [{ questionId: "q-1", answerText: "Text", answerData: null }],
      },
      {
        id: "res-2",
        answers: [{ questionId: "q-1", answerText: "More text", answerData: null }],
      },
    ];
    surveyResponseFindManyMock.mockResolvedValue(responses);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    const response = await request(app)
      .get(`${URL}/survey-001/results?teamId=team-1`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      suppressed: true,
      questions: [],
    });
  });
});
