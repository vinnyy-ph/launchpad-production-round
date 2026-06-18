import request from "supertest";
import { app } from "../../app";
import {
  buildSurveyListItem,
  resetSurveyMocks,
  surveyCountMock,
  surveyFindManyMock,
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

describe("GET /api/v1/pulse/surveys", () => {
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

    const response = await request(app).get(URL).expect(403);
    expect(response.body).toMatchObject({ success: false });
  });

  // ─── Empty List ────────────────────────────────────────────────────────────

  it("returns empty list when no surveys exist", async () => {
    surveyFindManyMock.mockResolvedValue([]);
    surveyCountMock.mockResolvedValue(0);

    const response = await request(app).get(URL).expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  });

  // ─── Status Filters ───────────────────────────────────────────────────────

  it("filters correctly by status=draft", async () => {
    const draftSurvey = buildSurveyListItem({ id: "draft-001", isActive: false, occurrenceCount: 0 });
    surveyFindManyMock.mockResolvedValue([draftSurvey]);
    surveyCountMock.mockResolvedValue(1);

    const response = await request(app).get(`${URL}?status=draft`).expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe("draft-001");
    expect(response.body.data[0].isActive).toBe(false);
    expect(response.body.data[0].occurrenceCount).toBe(0);

    // Verify the where clause passed to findMany includes the draft filter
    const findManyArgs = surveyFindManyMock.mock.calls[0][0];
    expect(findManyArgs.where).toMatchObject({ isActive: false, occurrences: { none: {} } });
  });

  it("filters correctly by status=active", async () => {
    const activeSurvey = buildSurveyListItem({ id: "active-001", isActive: true, occurrenceCount: 3 });
    surveyFindManyMock.mockResolvedValue([activeSurvey]);
    surveyCountMock.mockResolvedValue(1);

    const response = await request(app).get(`${URL}?status=active`).expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe("active-001");
    expect(response.body.data[0].isActive).toBe(true);

    const findManyArgs = surveyFindManyMock.mock.calls[0][0];
    expect(findManyArgs.where).toMatchObject({ isActive: true });
  });

  it("filters correctly by status=inactive", async () => {
    const inactiveSurvey = buildSurveyListItem({ id: "inactive-001", isActive: false, occurrenceCount: 2 });
    surveyFindManyMock.mockResolvedValue([inactiveSurvey]);
    surveyCountMock.mockResolvedValue(1);

    const response = await request(app).get(`${URL}?status=inactive`).expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe("inactive-001");
    expect(response.body.data[0].occurrenceCount).toBe(2);

    const findManyArgs = surveyFindManyMock.mock.calls[0][0];
    expect(findManyArgs.where).toMatchObject({ isActive: false, occurrences: { some: {} } });
  });

  it("returns 400 for invalid status value", async () => {
    const response = await request(app).get(`${URL}?status=bogus`).expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
    });
  });

  // ─── Occurrence Count ─────────────────────────────────────────────────────

  it("returns correct occurrenceCount", async () => {
    const survey = buildSurveyListItem({ occurrenceCount: 5 });
    surveyFindManyMock.mockResolvedValue([survey]);
    surveyCountMock.mockResolvedValue(1);

    const response = await request(app).get(URL).expect(200);

    expect(response.body.data[0].occurrenceCount).toBe(5);
  });

  // ─── Pagination ───────────────────────────────────────────────────────────

  it("pagination works (page, limit)", async () => {
    const surveys = Array.from({ length: 2 }, (_, i) =>
      buildSurveyListItem({ id: `survey-${i + 1}`, name: `Survey ${i + 1}` }),
    );
    surveyFindManyMock.mockResolvedValue(surveys);
    surveyCountMock.mockResolvedValue(5);

    const response = await request(app).get(`${URL}?page=2&limit=2`).expect(200);

    expect(response.body.meta).toMatchObject({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });

    // Verify skip/take sent to Prisma
    const findManyArgs = surveyFindManyMock.mock.calls[0][0];
    expect(findManyArgs.skip).toBe(2); // (2 - 1) * 2
    expect(findManyArgs.take).toBe(2);
  });

  it("uses default page=1 and limit=10 when not provided", async () => {
    surveyFindManyMock.mockResolvedValue([]);
    surveyCountMock.mockResolvedValue(0);

    await request(app).get(URL).expect(200);

    const findManyArgs = surveyFindManyMock.mock.calls[0][0];
    expect(findManyArgs.skip).toBe(0);
    expect(findManyArgs.take).toBe(10);
  });
});
