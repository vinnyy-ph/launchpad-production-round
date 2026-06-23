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
    surveyOccurrence: { findUnique: jest.fn(), findFirst: jest.fn() },
    surveyResponse: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    surveyAudienceMember: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    team: { findUnique: jest.fn() },
    surveyResultShare: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));

jest.mock("../../modules/shared/org/chains", () => ({
  createOrgChains: jest.fn(() => ({
    downwardChain: jest.fn().mockResolvedValue([]),
    upwardChain: jest.fn().mockResolvedValue([]),
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
    // An unscoped (no-occurrenceId) request resolves the survey's latest occurrence.
    (prisma.surveyOccurrence.findFirst as jest.Mock).mockResolvedValue({ id: "occ-default" });
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
      isActive: true,
      deadline: new Date("2030-01-01").toISOString(),
      _count: { occurrences: 1 },
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
    (prisma.surveyAudienceMember.count as jest.Mock).mockResolvedValue(5);
    (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

    const response = await request(app).get(`${URL}/survey-001/results`).expect(200);

    expect(response.body.success).toBe(true);
    // Occurrence-level summary totals (unfiltered) for the stat cards.
    expect(response.body.data.recipientCount).toBe(5);
    expect(response.body.data.respondedCount).toBe(2);
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

    expect(response.body.data.surveyName).toBe("Test Survey");
    expect(response.body.data).toHaveProperty("deadline");
    expect(response.body.data).toHaveProperty("isActive");
    expect(response.body.data).toHaveProperty("occurrenceCount");
  });

  it("defaults an unscoped request to the LATEST occurrence, not an all-rounds aggregate", async () => {
    const s = mockSurvey({ _count: { occurrences: 3 } });
    surveyFindFirstMock.mockResolvedValue(s);
    (prisma.surveyOccurrence.findFirst as jest.Mock).mockResolvedValue({ id: "occ-latest" });
    surveyResponseFindManyMock.mockResolvedValue([]);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    const audienceCount = prisma.surveyAudienceMember.count as jest.Mock;
    const responseCount = prisma.surveyResponse.count as jest.Mock;

    const res = await request(app).get(`${URL}/survey-001/results`).expect(200);

    // Data query + headline counts are scoped to the latest occurrence — NOT { occurrence: { surveyId } },
    // which would sum every round and produce the inflated denominator (e.g. 297 × rounds = 891).
    expect(surveyResponseFindManyMock.mock.calls[0][0].where).toMatchObject({ occurrenceId: "occ-latest" });
    expect(audienceCount.mock.calls[0][0].where).toMatchObject({ occurrenceId: "occ-latest" });
    expect(responseCount.mock.calls[0][0].where).toMatchObject({ occurrenceId: "occ-latest" });
    // The response echoes which round is shown so the picker can reflect the default selection.
    expect(res.body.data.occurrenceId).toBe("occ-latest");
  });

  it("normalizes wrapped {value}/{selected}/{choices} answer + option shapes (no [object Object])", async () => {
    const s = mockSurvey({
      questions: [
        { id: "q-2", type: "LINEAR_SCALE", questionText: "Scale Q", scaleMin: 1, scaleMax: 5, orderIndex: 1 },
        { id: "q-3", type: "MULTIPLE_CHOICE", questionText: "MC Q", options: { choices: ["Good", "Fair"] }, orderIndex: 2 },
        { id: "q-4", type: "CHECKBOX", questionText: "CB Q", options: { choices: ["A", "B"] }, orderIndex: 3 },
      ],
    });
    surveyFindFirstMock.mockResolvedValue(s);

    const responses = [
      {
        id: "r1",
        answers: [
          { questionId: "q-2", answerText: null, answerData: { value: 4 } },
          { questionId: "q-3", answerText: null, answerData: { selected: "Good" } },
          { questionId: "q-4", answerText: null, answerData: { selected: ["A", "B"] } },
        ],
      },
      {
        id: "r2",
        answers: [
          { questionId: "q-2", answerText: null, answerData: { value: 2 } },
          { questionId: "q-3", answerText: null, answerData: { selected: "Fair" } },
          { questionId: "q-4", answerText: null, answerData: { selected: ["A"] } },
        ],
      },
      {
        id: "r3",
        answers: [
          { questionId: "q-2", answerText: null, answerData: { value: 4 } },
          { questionId: "q-3", answerText: null, answerData: { selected: "Good" } },
          { questionId: "q-4", answerText: null, answerData: { selected: ["B"] } },
        ],
      },
    ];
    surveyResponseFindManyMock.mockResolvedValue(responses);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    const response = await request(app).get(`${URL}/survey-001/results`).expect(200);
    const qs = response.body.data.questions;

    expect(qs[0].distribution).toMatchObject({ "2": 1, "4": 2 });
    expect(qs[0].average).toBeCloseTo(3.33, 1);
    expect(qs[1].counts).toEqual({ Good: 2, Fair: 1 });
    expect(qs[2].counts).toEqual({ A: 2, B: 2 });
    expect(JSON.stringify(qs)).not.toContain("[object Object]");
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

  it("suppresses the TOP-LEVEL (unfiltered) anonymous view with fewer than 3 responses for a non-HR/root viewer", async () => {
    const s = mockSurvey({ isAnonymous: true, visibility: "EVERYONE" });
    surveyFindFirstMock.mockResolvedValue(s);

    // A normal (non-HR, non-root) viewer: the min-group rule applies to every view, not only
    // filtered ones. (Regression guard for the top-level anonymity leak.)
    employeeFindMock.mockResolvedValue({
      id: "emp-1",
      userId: "test-user-id",
      supervisorId: "boss-id",
      teamMemberships: [],
    });
    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

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

  it("returns { suppressed: true, questions: [] } when a filtered group has fewer than 3 responses (non-HR/root viewer)", async () => {
    const s = mockSurvey({ isAnonymous: true, visibility: "EVERYONE" });
    surveyFindFirstMock.mockResolvedValue(s);

    // Team is large enough that the small-team overlay does NOT fire — this asserts the
    // response-count (MIN_GROUP) suppression, not the team-size rule.
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: "team-1",
      name: "Team One",
      leaderId: "leader-emp",
      leader: { id: "leader-emp", firstName: "L", lastName: "X", status: "ACTIVE" },
      _count: { members: 5 },
    });

    // Non-HR member of team-1 (the filter restriction allows their own team).
    employeeFindMock.mockResolvedValue({
      id: "emp-1",
      userId: "test-user-id",
      supervisorId: "boss-id",
      teamMemberships: [{ teamId: "team-1" }],
    });
    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

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

  // Anonymous survey + team-scoped view of a team with fewer than 3 members: hidden from
  // that team's own supervisor (leader); HR and managers above the leader still see it.
  describe("anonymous small-team (< 3 members) visibility overlay", () => {
    const teamFindMock = prisma.team.findUnique as jest.Mock;

    const twoResponses = [
      { id: "r1", answers: [{ questionId: "q-1", answerText: "A", answerData: null }] },
      { id: "r2", answers: [{ questionId: "q-1", answerText: "B", answerData: null }] },
    ];

    it("403s the small team's supervisor (leader) with a dedicated error code", async () => {
      surveyFindFirstMock.mockResolvedValue(mockSurvey({ isAnonymous: true }));
      teamFindMock.mockResolvedValue({ leaderId: "leader-emp", _count: { members: 2 } });
      mockCreateOrgChains.mockReturnValue({
        downwardChain: jest.fn().mockResolvedValue([]),
        upwardChain: jest.fn().mockResolvedValue(["boss-emp"]),
      });
      employeeFindMock.mockResolvedValue({
        id: "leader-emp",
        userId: "leader-user",
        supervisorId: "boss-emp",
        teamMemberships: [{ teamId: "team-small" }],
      });
      setAuthUser({ id: "leader-user", role: "EMPLOYEE" });

      const res = await request(app)
        .get(`${URL}/survey-001/results?teamId=team-small`)
        .expect(403);
      expect(res.body).toMatchObject({
        success: false,
        errorCode: "RESULTS_FORBIDDEN_SMALL_TEAM_SUPERVISOR",
      });
    });

    it("lets the small team's supervisor (leader) see results once HR has shared them", async () => {
      surveyFindFirstMock.mockResolvedValue(mockSurvey({ isAnonymous: true }));
      teamFindMock.mockResolvedValue({
        id: "team-small",
        name: "Team Small",
        leaderId: "leader-emp",
        leader: { id: "leader-emp", firstName: "Lee", lastName: "Dre", status: "ACTIVE" },
        _count: { members: 2 },
      });
      mockCreateOrgChains.mockReturnValue({
        downwardChain: jest.fn().mockResolvedValue([]),
        upwardChain: jest.fn().mockResolvedValue(["boss-emp"]),
      });
      employeeFindMock.mockResolvedValue({
        id: "leader-emp",
        userId: "leader-user",
        supervisorId: "boss-emp",
        teamMemberships: [{ teamId: "team-small" }],
      });
      // A share grant exists for this occurrence + team → the leader is let through.
      (prisma.surveyResultShare.findUnique as jest.Mock).mockResolvedValue({
        id: "share-1",
        occurrenceId: "occ-default",
        teamId: "team-small",
        supervisorId: "leader-emp",
        sharedAt: new Date(),
      });
      surveyResponseFindManyMock.mockResolvedValue(twoResponses);
      surveyAudienceFindManyMock.mockResolvedValue([]);
      setAuthUser({ id: "leader-user", role: "EMPLOYEE" });

      const res = await request(app)
        .get(`${URL}/survey-001/results?teamId=team-small`)
        .expect(200);
      expect(res.body.data.suppressed).toBe(false);
      expect(res.body.data.questions.length).toBeGreaterThan(0);
    });

    it("attaches a smallTeamShare hint for HR on an anonymous small-team filtered view", async () => {
      surveyFindFirstMock.mockResolvedValue(mockSurvey({ isAnonymous: true }));
      teamFindMock.mockResolvedValue({
        id: "team-small",
        name: "Team Small",
        leaderId: "leader-emp",
        leader: { id: "leader-emp", firstName: "Lee", lastName: "Dre", status: "ACTIVE" },
        _count: { members: 2 },
      });
      // Completed occurrence (deadline in the past) → action will be enabled.
      (prisma.surveyOccurrence.findUnique as jest.Mock).mockResolvedValue({
        id: "occ-default",
        surveyId: "survey-001",
        isClosed: false,
        deadline: new Date("2020-01-01"),
      });
      (prisma.surveyResultShare.findUnique as jest.Mock).mockResolvedValue(null);
      surveyResponseFindManyMock.mockResolvedValue(twoResponses);
      surveyAudienceFindManyMock.mockResolvedValue([]);
      // caller is HR (default auth)

      const res = await request(app)
        .get(`${URL}/survey-001/results?teamId=team-small`)
        .expect(200);

      expect(res.body.data.smallTeamShare).toMatchObject({
        teamId: "team-small",
        teamName: "Team Small",
        supervisorId: "leader-emp",
        supervisorName: "Lee Dre",
        occurrenceCompleted: true,
        alreadySharedAt: null,
      });
    });

    it("does NOT attach a smallTeamShare hint for a non-HR head-above viewer", async () => {
      surveyFindFirstMock.mockResolvedValue(mockSurvey({ isAnonymous: true }));
      teamFindMock.mockResolvedValue({
        id: "team-small",
        name: "Team Small",
        leaderId: "leader-emp",
        leader: { id: "leader-emp", firstName: "Lee", lastName: "Dre", status: "ACTIVE" },
        _count: { members: 2 },
      });
      mockCreateOrgChains.mockReturnValue({
        downwardChain: jest.fn().mockResolvedValue([]),
        upwardChain: jest.fn().mockResolvedValue(["boss-emp"]),
      });
      employeeFindMock.mockResolvedValue({
        id: "boss-emp",
        userId: "boss-user",
        supervisorId: null,
        teamMemberships: [],
      });
      (prisma.surveyResultShare.findUnique as jest.Mock).mockResolvedValue(null);
      surveyResponseFindManyMock.mockResolvedValue(twoResponses);
      surveyAudienceFindManyMock.mockResolvedValue([]);
      setAuthUser({ id: "boss-user", role: "EMPLOYEE" });

      const res = await request(app)
        .get(`${URL}/survey-001/results?teamId=team-small`)
        .expect(200);
      expect(res.body.data.smallTeamShare).toBeUndefined();
    });

    it("lets a manager above the supervisor see the small team's results (suppression lifted)", async () => {
      surveyFindFirstMock.mockResolvedValue(mockSurvey({ isAnonymous: true }));
      teamFindMock.mockResolvedValue({ leaderId: "leader-emp", _count: { members: 2 } });
      mockCreateOrgChains.mockReturnValue({
        downwardChain: jest.fn().mockResolvedValue([]),
        upwardChain: jest.fn().mockResolvedValue(["boss-emp"]),
      });
      employeeFindMock.mockResolvedValue({
        id: "boss-emp",
        userId: "boss-user",
        supervisorId: null,
        teamMemberships: [],
      });
      surveyResponseFindManyMock.mockResolvedValue(twoResponses);
      surveyAudienceFindManyMock.mockResolvedValue([]);
      setAuthUser({ id: "boss-user", role: "EMPLOYEE" });

      const res = await request(app)
        .get(`${URL}/survey-001/results?teamId=team-small`)
        .expect(200);
      expect(res.body.data.suppressed).toBe(false);
      expect(res.body.data.questions.length).toBeGreaterThan(0);
    });

    it("lets HR see the small team's results even below the min-group threshold", async () => {
      surveyFindFirstMock.mockResolvedValue(mockSurvey({ isAnonymous: true }));
      teamFindMock.mockResolvedValue({ leaderId: "leader-emp", _count: { members: 2 } });
      surveyResponseFindManyMock.mockResolvedValue(twoResponses);
      surveyAudienceFindManyMock.mockResolvedValue([]);
      // caller is HR (default auth)

      const res = await request(app)
        .get(`${URL}/survey-001/results?teamId=team-small`)
        .expect(200);
      expect(res.body.data.suppressed).toBe(false);
    });

    it("does not apply to non-anonymous surveys (supervisor still sees results)", async () => {
      surveyFindFirstMock.mockResolvedValue(
        mockSurvey({ isAnonymous: false, visibility: "EVERYONE" }),
      );
      teamFindMock.mockResolvedValue({ leaderId: "leader-emp", _count: { members: 2 } });
      surveyResponseFindManyMock.mockResolvedValue([]);
      surveyAudienceFindManyMock.mockResolvedValue([]);
      employeeFindMock.mockResolvedValue({
        id: "leader-emp",
        userId: "leader-user",
        supervisorId: "boss-emp",
        teamMemberships: [{ teamId: "team-small" }],
      });
      setAuthUser({ id: "leader-user", role: "EMPLOYEE" });

      await request(app)
        .get(`${URL}/survey-001/results?teamId=team-small`)
        .expect(200);
    });

    it("lets HR see the unfiltered view when the whole audience is below 3 (e.g. a single 2-person team)", async () => {
      surveyFindFirstMock.mockResolvedValue(mockSurvey({ isAnonymous: true }));
      surveyResponseFindManyMock.mockResolvedValue(twoResponses);
      surveyAudienceFindManyMock.mockResolvedValue([]);
      (prisma.surveyAudienceMember.count as jest.Mock).mockResolvedValue(2);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);
      // caller is HR (default auth), no team/supervisor filter

      const res = await request(app).get(`${URL}/survey-001/results`).expect(200);
      expect(res.body.data.suppressed).toBe(false);
      expect(res.body.data.questions.length).toBeGreaterThan(0);
    });

    it("lets HR see below-threshold results even with a large audience (data-controller exception)", async () => {
      // Per Fix 3: HR (and root) always see the underlying results below the min-group threshold —
      // they cannot re-identify an anonymous respondent, and the guard exists to stop peer/
      // supervisor re-identification, not the data controller. (Deliberate reversal of the
      // prior "suppress for HR too" behavior.)
      surveyFindFirstMock.mockResolvedValue(mockSurvey({ isAnonymous: true }));
      surveyResponseFindManyMock.mockResolvedValue(twoResponses);
      surveyAudienceFindManyMock.mockResolvedValue([]);
      (prisma.surveyAudienceMember.count as jest.Mock).mockResolvedValue(20);
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(2);

      const res = await request(app).get(`${URL}/survey-001/results`).expect(200);
      expect(res.body.data.suppressed).toBe(false);
      expect(res.body.data.questions.length).toBeGreaterThan(0);
    });

    it("lets the org root node see below-threshold results (controlled exception)", async () => {
      surveyFindFirstMock.mockResolvedValue(mockSurvey({ isAnonymous: true, visibility: "EVERYONE" }));
      employeeFindMock.mockResolvedValue({
        id: "ceo",
        userId: "ceo-user",
        supervisorId: null, // root node
        teamMemberships: [],
      });
      setAuthUser({ id: "ceo-user", role: "EMPLOYEE" });
      surveyResponseFindManyMock.mockResolvedValue(twoResponses);
      surveyAudienceFindManyMock.mockResolvedValue([]);

      const res = await request(app).get(`${URL}/survey-001/results`).expect(200);
      expect(res.body.data.suppressed).toBe(false);
      expect(res.body.data.questions.length).toBeGreaterThan(0);
    });
  });

  it("scopes the aggregate to the caller's own chain for a non-HR SUPERVISOR_BASED viewer (no filter)", async () => {
    const s = mockSurvey({ visibility: "SUPERVISOR_BASED" });
    surveyFindFirstMock.mockResolvedValue(s);

    employeeFindMock.mockResolvedValue({
      id: "sup-1",
      userId: "test-user-id",
      supervisorId: "boss-id",
      teamMemberships: [],
    });

    // sup-1 manages report-1 and report-2; report-1 is in the audience → access granted.
    mockCreateOrgChains.mockReturnValue({
      downwardChain: jest.fn().mockResolvedValue(["report-1", "report-2"]),
    });
    surveyAudienceFindManyMock.mockResolvedValue([{ employeeId: "report-1" }]);
    surveyResponseFindManyMock.mockResolvedValue([]);

    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

    await request(app).get(`${URL}/survey-001/results`).expect(200);

    // The aggregation query must be constrained to the caller's own chain, NOT the whole
    // audience — otherwise a supervisor reads responses from outside their scope.
    const whereArg = surveyResponseFindManyMock.mock.calls[0][0].where;
    expect(whereArg.AND).toEqual(
      expect.arrayContaining([
        { respondentSupervisorId: { in: ["sup-1", "report-1", "report-2"] } },
      ]),
    );
  });

  it("scopes the headline counts to the caller's chain for a non-HR SUPERVISOR_BASED viewer", async () => {
    const s = mockSurvey({ visibility: "SUPERVISOR_BASED" });
    surveyFindFirstMock.mockResolvedValue(s);

    employeeFindMock.mockResolvedValue({
      id: "sup-1",
      userId: "test-user-id",
      supervisorId: "boss-id",
      teamMemberships: [],
    });

    mockCreateOrgChains.mockReturnValue({
      downwardChain: jest.fn().mockResolvedValue(["report-1", "report-2"]),
    });
    surveyAudienceFindManyMock.mockResolvedValue([{ employeeId: "report-1" }]);
    surveyResponseFindManyMock.mockResolvedValue([]);

    const audienceCount = prisma.surveyAudienceMember.count as jest.Mock;
    const responseCount = prisma.surveyResponse.count as jest.Mock;
    audienceCount.mockResolvedValue(2);
    responseCount.mockResolvedValue(1);

    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

    await request(app).get(`${URL}/survey-001/results`).expect(200);

    // Both the denominator (recipients) and numerator (responses) must be bounded to the
    // caller's chain, otherwise the headline rate leaks org-wide totals.
    const ids = ["sup-1", "report-1", "report-2"];
    expect(audienceCount.mock.calls[0][0].where).toMatchObject({ employeeId: { in: ids } });
    expect(responseCount.mock.calls[0][0].where).toMatchObject({
      respondentSupervisorId: { in: ids },
    });
  });

  it("does NOT scope a non-HR EVERYONE viewer — they are entitled to the org-wide aggregate", async () => {
    const s = mockSurvey({ visibility: "EVERYONE" });
    surveyFindFirstMock.mockResolvedValue(s);

    employeeFindMock.mockResolvedValue({
      id: "emp-1",
      userId: "test-user-id",
      supervisorId: "boss-id",
      teamMemberships: [{ teamId: "team-1" }],
    });
    surveyResponseFindManyMock.mockResolvedValue([]);

    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

    await request(app).get(`${URL}/survey-001/results`).expect(200);

    const whereArg = surveyResponseFindManyMock.mock.calls[0][0].where;
    expect(whereArg.AND).toBeUndefined();
  });

  it("auto-lifts suppression for a non-HR viewer once the group reaches 3 responses (Fix 2)", async () => {
    const s = mockSurvey({ isAnonymous: true, visibility: "EVERYONE" });
    surveyFindFirstMock.mockResolvedValue(s);
    employeeFindMock.mockResolvedValue({
      id: "emp-1",
      userId: "test-user-id",
      supervisorId: "boss-id",
      teamMemberships: [],
    });
    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });
    surveyResponseFindManyMock.mockResolvedValue([
      { id: "r1", answers: [{ questionId: "q-1", answerText: "a", answerData: null }] },
      { id: "r2", answers: [{ questionId: "q-1", answerText: "b", answerData: null }] },
      { id: "r3", answers: [{ questionId: "q-1", answerText: "c", answerData: null }] },
    ]);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    const res = await request(app).get(`${URL}/survey-001/results`).expect(200);
    expect(res.body.data.suppressed).toBe(false);
  });

  it("a supervisor below the audience anchor sees a supervisor-based survey scoped to their own subtree (Fix 4)", async () => {
    const s = mockSurvey({ visibility: "SUPERVISOR_BASED", isAnonymous: false });
    surveyFindFirstMock.mockResolvedValue(s);
    // Mid-chain manager (NOT the issuing/anchor supervisor); their report r1 is in the audience.
    employeeFindMock.mockResolvedValue({
      id: "mid-mgr",
      userId: "test-user-id",
      supervisorId: "vp-id",
      teamMemberships: [],
    });
    mockCreateOrgChains.mockReturnValue({
      downwardChain: jest.fn().mockResolvedValue(["r1", "r2"]),
    });
    surveyAudienceFindManyMock.mockResolvedValue([{ employeeId: "r1" }]);
    surveyResponseFindManyMock.mockResolvedValue([]);
    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });

    await request(app).get(`${URL}/survey-001/results`).expect(200);
    // Access granted via downward-chain overlap, and data scoped to their OWN subtree.
    const whereArg = surveyResponseFindManyMock.mock.calls[0][0].where;
    expect(whereArg.AND).toEqual(
      expect.arrayContaining([{ respondentSupervisorId: { in: ["mid-mgr", "r1", "r2"] } }]),
    );
  });

  // ── Fix 1: HR access is not gated by survey state ──────────────────────────────
  it("HR can view results after deactivation / past deadline (closed) — no state gate (Fix 1)", async () => {
    // "Closed" = not active but occurrence-bearing. Deactivating stops future rounds; the
    // responses already collected stay viewable. HR opens them in any state.
    const s = mockSurvey({ isActive: false, _count: { occurrences: 1 } });
    surveyFindFirstMock.mockResolvedValue(s);
    surveyResponseFindManyMock.mockResolvedValue([
      { id: "r1", answers: [{ questionId: "q-1", answerText: "kept", answerData: null }] },
    ]);
    surveyAudienceFindManyMock.mockResolvedValue([]);
    (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(1);
    (prisma.surveyAudienceMember.count as jest.Mock).mockResolvedValue(3);
    // caller is HR (default auth)

    const res = await request(app).get(`${URL}/survey-001/results`).expect(200);
    expect(res.body.data.isActive).toBe(false);
    expect(res.body.data.questions.length).toBeGreaterThan(0);
  });

  // ── Fix 2: root is on the access floor, but data stays scoped to its chain ──────
  it("root (no supervisor) opens a SUPERVISOR_BASED survey with NO audience overlap — access floor, data scoped to chain (Fix 2)", async () => {
    const s = mockSurvey({ visibility: "SUPERVISOR_BASED", isAnonymous: false });
    surveyFindFirstMock.mockResolvedValue(s);
    // Root node: no supervisor. Its downward chain (mocked) is the data boundary.
    employeeFindMock.mockResolvedValue({
      id: "ceo",
      userId: "ceo-user",
      supervisorId: null,
      teamMemberships: [],
    });
    mockCreateOrgChains.mockReturnValue({
      downwardChain: jest.fn().mockResolvedValue(["r1", "r2"]),
    });
    // The audience does NOT overlap the root's probe — so access here comes from the root
    // floor, not the SUPERVISOR_BASED scope predicate. (Was a 403 before the floor fix.)
    surveyAudienceFindManyMock.mockResolvedValue([{ employeeId: "outsider" }]);
    surveyResponseFindManyMock.mockResolvedValue([]);
    setAuthUser({ id: "ceo-user", role: "EMPLOYEE" });

    await request(app).get(`${URL}/survey-001/results`).expect(200);
    // Access-only, NOT full data-controller: the aggregate stays bounded to the root's own
    // chain (no org-wide widening like HR gets).
    const whereArg = surveyResponseFindManyMock.mock.calls[0][0].where;
    expect(whereArg.AND).toEqual(
      expect.arrayContaining([{ respondentSupervisorId: { in: ["ceo", "r1", "r2"] } }]),
    );
  });

  // ── Fix 3: anonymity tiers from the very first answer ──────────────────────────
  it("anonymous survey, a single response: HR sees it from the first answer (Fix 3 tier 3)", async () => {
    const s = mockSurvey({ isAnonymous: true, visibility: "EVERYONE" });
    surveyFindFirstMock.mockResolvedValue(s);
    surveyResponseFindManyMock.mockResolvedValue([
      { id: "r1", answers: [{ questionId: "q-2", answerText: null, answerData: 5 }] },
    ]);
    surveyAudienceFindManyMock.mockResolvedValue([]);
    // caller is HR (default auth)

    const res = await request(app).get(`${URL}/survey-001/results`).expect(200);
    expect(res.body.data.suppressed).toBe(false);
    expect(res.body.data.questions.length).toBeGreaterThan(0);
  });

  it("anonymous survey, a single response: a non-HR/root in-scope viewer sees the suppressed state (Fix 3 tier 3)", async () => {
    const s = mockSurvey({ isAnonymous: true, visibility: "EVERYONE" });
    surveyFindFirstMock.mockResolvedValue(s);
    employeeFindMock.mockResolvedValue({
      id: "emp-1",
      userId: "test-user-id",
      supervisorId: "boss-id",
      teamMemberships: [],
    });
    setAuthUser({ id: "test-user-id", role: "EMPLOYEE" });
    surveyResponseFindManyMock.mockResolvedValue([
      { id: "r1", answers: [{ questionId: "q-2", answerText: null, answerData: 5 }] },
    ]);
    surveyAudienceFindManyMock.mockResolvedValue([]);

    const res = await request(app).get(`${URL}/survey-001/results`).expect(200);
    expect(res.body.data).toMatchObject({ suppressed: true, questions: [] });
  });
});
