import request from "supertest";
import { app } from "../../app";
import {
  buildEvaluationRecord,
  buildReviewerEmployee,
  evalFindFirstMock,
  employeeFindUniqueMock,
  resetEvaluationMocks,
} from "./evaluations-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-reviewer-user-id" };
    next();
  }),
}));

jest.mock("../../modules/shared", () => ({
  downwardChain: jest.fn().mockResolvedValue([]),
  upwardChain: jest.fn().mockResolvedValue([]),
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

const EVAL_ID = "eval-001";

describe("GET /api/v1/evaluations/:evaluationId", () => {
  beforeEach(() => {
    resetEvaluationMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );

    await request(app).get(`/api/v1/evaluations/${EVAL_ID}`).expect(401);
  });

  it("returns 404 when the evaluation does not exist", async () => {
    evalFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/v1/evaluations/${EVAL_ID}`)
      .expect(404);

    expect(response.body).toMatchObject({ success: false, errorCode: "EVALUATION_NOT_FOUND" });
  });

  describe("Draft evaluations", () => {
    it("returns 200 when requested by the reviewer", async () => {
      const reviewer = buildReviewerEmployee();
      const existing = buildEvaluationRecord({ reviewerId: reviewer.id, isSent: false });

      evalFindFirstMock.mockResolvedValue(existing);
      employeeFindUniqueMock.mockResolvedValue(reviewer);

      const response = await request(app)
        .get(`/api/v1/evaluations/${EVAL_ID}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: existing.id,
        reviewerId: reviewer.id,
        isSent: false,
      });
    });

    it("returns 403 when requested by another employee", async () => {
      const reviewer = buildReviewerEmployee({ id: "creator-id" });
      const requester = buildReviewerEmployee({ id: "requester-id" });
      const existing = buildEvaluationRecord({ reviewerId: reviewer.id, isSent: false });

      evalFindFirstMock.mockResolvedValue(existing);
      employeeFindUniqueMock.mockResolvedValue(requester);

      const response = await request(app)
        .get(`/api/v1/evaluations/${EVAL_ID}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        message: "Forbidden",
      });
    });

    it("returns 403 when requested by the reviewee", async () => {
      const reviewer = buildReviewerEmployee();
      const existing = buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: "reviewee-id", isSent: false });
      const reviewee = buildReviewerEmployee({ id: "reviewee-id" });

      evalFindFirstMock.mockResolvedValue(existing);
      employeeFindUniqueMock.mockResolvedValue(reviewee);

      await request(app)
        .get(`/api/v1/evaluations/${EVAL_ID}`)
        .expect(403);
    });

    it("returns 403 when requested by HR", async () => {
      const authMock = jest.requireMock("../../core/middleware/auth.middleware");
      authMock.authenticate.mockImplementationOnce(
        (req: any, _res: unknown, next: () => void) => {
          req.user = { id: "hr-user-id", role: "HR" };
          next();
        },
      );

      const reviewer = buildReviewerEmployee();
      const existing = buildEvaluationRecord({ reviewerId: reviewer.id, isSent: false });
      const hr = buildReviewerEmployee({ id: "hr-id" });

      evalFindFirstMock.mockResolvedValue(existing);
      employeeFindUniqueMock.mockResolvedValue(hr);

      await request(app)
        .get(`/api/v1/evaluations/${EVAL_ID}`)
        .expect(403);
    });
  });

  describe("Sent evaluations", () => {
    it("returns 200 when requested by the reviewer", async () => {
      const reviewer = buildReviewerEmployee();
      const existing = buildEvaluationRecord({ reviewerId: reviewer.id, isSent: true });

      evalFindFirstMock.mockResolvedValue(existing);
      employeeFindUniqueMock.mockResolvedValue(reviewer);

      await request(app)
        .get(`/api/v1/evaluations/${EVAL_ID}`)
        .expect(200);
    });

    it("returns 200 when requested by the reviewee", async () => {
      const reviewer = buildReviewerEmployee();
      const existing = buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: "reviewee-id", isSent: true });
      const reviewee = buildReviewerEmployee({ id: "reviewee-id" });

      evalFindFirstMock.mockResolvedValue(existing);
      employeeFindUniqueMock.mockResolvedValue(reviewee);

      await request(app)
        .get(`/api/v1/evaluations/${EVAL_ID}`)
        .expect(200);
    });

    it("returns 200 when requested by HR", async () => {
      const authMock = jest.requireMock("../../core/middleware/auth.middleware");
      authMock.authenticate.mockImplementationOnce(
        (req: any, _res: unknown, next: () => void) => {
          req.user = { id: "hr-user-id", role: "HR" };
          next();
        },
      );

      const reviewer = buildReviewerEmployee();
      const existing = buildEvaluationRecord({ reviewerId: reviewer.id, isSent: true });

      evalFindFirstMock.mockResolvedValue(existing);

      await request(app)
        .get(`/api/v1/evaluations/${EVAL_ID}`)
        .expect(200);
    });

    it("returns 200 when requested by an upward supervisor", async () => {
      const reviewer = buildReviewerEmployee();
      const existing = buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: "reviewee-id", isSent: true });
      const grandSupervisor = buildReviewerEmployee({ id: "grand-id" });

      const sharedMock = jest.requireMock("../../modules/shared");
      sharedMock.upwardChain.mockResolvedValueOnce(["reviewer-id", "grand-id"]);

      evalFindFirstMock.mockResolvedValue(existing);
      employeeFindUniqueMock.mockResolvedValue(grandSupervisor);

      await request(app)
        .get(`/api/v1/evaluations/${EVAL_ID}`)
        .expect(200);
    });

    it("returns 403 when requested by an unrelated employee", async () => {
      const reviewer = buildReviewerEmployee();
      const existing = buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: "reviewee-id", isSent: true });
      const unrelated = buildReviewerEmployee({ id: "unrelated-id" });

      const sharedMock = jest.requireMock("../../modules/shared");
      sharedMock.upwardChain.mockResolvedValueOnce(["reviewer-id"]);

      evalFindFirstMock.mockResolvedValue(existing);
      employeeFindUniqueMock.mockResolvedValue(unrelated);

      await request(app)
        .get(`/api/v1/evaluations/${EVAL_ID}`)
        .expect(403);
    });
  });
});
