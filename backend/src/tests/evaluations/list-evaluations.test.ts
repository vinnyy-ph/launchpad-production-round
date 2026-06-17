import request from "supertest";
import { app } from "../../app";
import {
  buildEvaluationRecord,
  buildReviewerEmployee,
  evalCountMock,
  evalFindManyMock,
  employeeFindUniqueMock,
  resetEvaluationMocks,
} from "./evaluations-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-reviewer-user-id" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn() },
    performanceEvaluation: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("GET /api/v1/evaluations", () => {
  beforeEach(() => {
    resetEvaluationMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );

    await request(app).get("/api/v1/evaluations").expect(401);
  });

  it("returns 403 when the authenticated user has no employee record", async () => {
    employeeFindUniqueMock.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/evaluations").expect(403);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "REVIEWER_NOT_EMPLOYEE",
    });
    expect(evalFindManyMock).not.toHaveBeenCalled();
  });

  it("returns an empty list when the reviewer has no evaluations", async () => {
    employeeFindUniqueMock.mockResolvedValue(buildReviewerEmployee());
    evalFindManyMock.mockResolvedValue([]);
    evalCountMock.mockResolvedValue(0);

    const response = await request(app).get("/api/v1/evaluations").expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it("returns paginated evaluations with default page and limit", async () => {
    const reviewer = buildReviewerEmployee();
    const evaluation = buildEvaluationRecord({ reviewerId: reviewer.id });

    employeeFindUniqueMock.mockResolvedValue(reviewer);
    evalFindManyMock.mockResolvedValue([evaluation]);
    evalCountMock.mockResolvedValue(1);

    const response = await request(app).get("/api/v1/evaluations").expect(200);

    expect(response.body).toMatchObject({
      success: true,
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: evaluation.id,
      reviewerId: reviewer.id,
      grade: evaluation.grade,
      isSent: false,
    });
  });

  it("applies custom page and limit", async () => {
    employeeFindUniqueMock.mockResolvedValue(buildReviewerEmployee());
    evalFindManyMock.mockResolvedValue([]);
    evalCountMock.mockResolvedValue(50);

    const response = await request(app)
      .get("/api/v1/evaluations?page=3&limit=10")
      .expect(200);

    expect(response.body.meta).toMatchObject({ page: 3, limit: 10, total: 50, totalPages: 5 });
  });

  it("caps limit at 100", async () => {
    employeeFindUniqueMock.mockResolvedValue(buildReviewerEmployee());
    evalFindManyMock.mockResolvedValue([]);
    evalCountMock.mockResolvedValue(0);

    const response = await request(app)
      .get("/api/v1/evaluations?limit=999")
      .expect(200);

    expect(response.body.meta.limit).toBe(100);
  });

  it("filters by status=draft (unsent evaluations)", async () => {
    const reviewer = buildReviewerEmployee();
    const draft = buildEvaluationRecord({ reviewerId: reviewer.id, isSent: false });

    employeeFindUniqueMock.mockResolvedValue(reviewer);
    evalFindManyMock.mockResolvedValue([draft]);
    evalCountMock.mockResolvedValue(1);

    const response = await request(app)
      .get("/api/v1/evaluations?status=draft")
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].isSent).toBe(false);

    const [[{ where }]] = evalFindManyMock.mock.calls;
    expect(where).toMatchObject({ isSent: false });
  });

  it("filters by status=sent (sent evaluations)", async () => {
    const reviewer = buildReviewerEmployee();
    const sent = buildEvaluationRecord({
      reviewerId: reviewer.id,
      isSent: true,
      sentAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    employeeFindUniqueMock.mockResolvedValue(reviewer);
    evalFindManyMock.mockResolvedValue([sent]);
    evalCountMock.mockResolvedValue(1);

    const response = await request(app)
      .get("/api/v1/evaluations?status=sent")
      .expect(200);

    expect(response.body.data[0].isSent).toBe(true);

    const [[{ where }]] = evalFindManyMock.mock.calls;
    expect(where).toMatchObject({ isSent: true });
  });

  it("returns 400 for an invalid status value", async () => {
    employeeFindUniqueMock.mockResolvedValue(buildReviewerEmployee());

    const response = await request(app)
      .get("/api/v1/evaluations?status=archived")
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
    });
    expect(evalFindManyMock).not.toHaveBeenCalled();
  });
});
