import request from "supertest";
import { app } from "../../app";
import {
  buildEvaluationRecord,
  buildRevieweeEmployee,
  buildReviewerEmployee,
  evalCreateMock,
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

const VALID_BODY = {
  revieweeId: "emp-reviewee-id",
  evaluationPeriod: "Q1 2026",
  grade: 4,
};

describe("POST /api/v1/evaluations", () => {
  beforeEach(() => {
    resetEvaluationMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );

    await request(app).post("/api/v1/evaluations").send(VALID_BODY).expect(401);
  });

  it("returns 400 when request body is missing", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .expect(400);

    expect(response.body).toMatchObject({ success: false, errorCode: "VALIDATION_FAILED" });
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when revieweeId is missing", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ evaluationPeriod: "Q1 2026", grade: 4 })
      .expect(400);

    expect(response.body.errors[0].message).toBe("revieweeId is required");
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when evaluationPeriod is missing", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ revieweeId: "emp-reviewee-id", grade: 4 })
      .expect(400);

    expect(response.body.errors[0].message).toBe("evaluationPeriod is required");
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when grade is out of range", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, grade: 6 })
      .expect(400);

    expect(response.body.errors[0].message).toBe("grade must be an integer between 1 and 5");
  });

  it("returns 400 when grade is not an integer", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, grade: 3.5 })
      .expect(400);

    expect(response.body.errors[0].message).toBe("grade must be an integer between 1 and 5");
  });

  it("returns 400 when send is not a boolean", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, send: "yes" })
      .expect(400);

    expect(response.body.errors[0].message).toBe("send must be a boolean");
  });

  it("returns 403 when the authenticated user has no employee record", async () => {
    employeeFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/evaluations")
      .send(VALID_BODY)
      .expect(403);

    expect(response.body).toMatchObject({ success: false, errorCode: "REVIEWER_NOT_EMPLOYEE" });
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the reviewee employee does not exist", async () => {
    const reviewer = buildReviewerEmployee();
    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(null);

    const response = await request(app)
      .post("/api/v1/evaluations")
      .send(VALID_BODY)
      .expect(404);

    expect(response.body).toMatchObject({ success: false, errorCode: "EMPLOYEE_NOT_FOUND" });
  });

  it("returns 403 when the reviewer is not the direct supervisor of the reviewee", async () => {
    const reviewer = buildReviewerEmployee();
    const reviewee = { id: "emp-reviewee-id", supervisorId: "someone-else-id" };

    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(reviewee);

    const response = await request(app)
      .post("/api/v1/evaluations")
      .send(VALID_BODY)
      .expect(403);

    expect(response.body).toMatchObject({ success: false, errorCode: "NOT_SUPERVISOR" });
  });

  it("creates and returns a draft evaluation (send omitted)", async () => {
    const reviewer = buildReviewerEmployee();
    const reviewee = buildRevieweeEmployee(reviewer.id);
    const evaluation = buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: reviewee.id });

    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(reviewee);
    evalCreateMock.mockResolvedValue(evaluation);

    const response = await request(app)
      .post("/api/v1/evaluations")
      .send(VALID_BODY)
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: evaluation.id,
        reviewerId: reviewer.id,
        revieweeId: reviewee.id,
        isSent: false,
        sentAt: null,
        ackDeadline: null,
      },
    });

    const [createCall] = evalCreateMock.mock.calls;
    expect(createCall[0].data).toMatchObject({ isSent: false });
  });

  it("creates a sent evaluation and sets isSent, sentAt, and ackDeadline", async () => {
    const reviewer = buildReviewerEmployee();
    const reviewee = buildRevieweeEmployee(reviewer.id);
    const now = new Date();
    const sentEvaluation = buildEvaluationRecord({
      reviewerId: reviewer.id,
      revieweeId: reviewee.id,
      isSent: true,
      sentAt: now,
      ackDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    });

    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(reviewee);
    evalCreateMock.mockResolvedValue(sentEvaluation);

    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, send: true })
      .expect(201);

    expect(response.body.data).toMatchObject({ isSent: true });
    expect(response.body.data.sentAt).not.toBeNull();
    expect(response.body.data.ackDeadline).not.toBeNull();

    const [createCall] = evalCreateMock.mock.calls;
    expect(createCall[0].data).toMatchObject({ isSent: true });
    expect(createCall[0].data.sentAt).toBeDefined();
    expect(createCall[0].data.ackDeadline).toBeDefined();
  });

  it("persists optional fields when provided", async () => {
    const reviewer = buildReviewerEmployee();
    const reviewee = buildRevieweeEmployee(reviewer.id);
    const withOptionals = {
      ...buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: reviewee.id }),
      highlights: "Delivered ahead of schedule",
      lowlights: "Could improve documentation",
    };

    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(reviewee);
    evalCreateMock.mockResolvedValue(withOptionals);

    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, highlights: "Delivered ahead of schedule", lowlights: "Could improve documentation" })
      .expect(201);

    expect(response.body.data).toMatchObject({
      highlights: "Delivered ahead of schedule",
      lowlights: "Could improve documentation",
    });
  });
});
