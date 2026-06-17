import request from "supertest";
import { app } from "../../app";
import {
  buildEvaluationRecord,
  buildRevieweeEmployee,
  buildReviewerEmployee,
  evalFindFirstMock,
  evalUpdateMock,
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

const EVAL_ID = "eval-001";

describe("PATCH /api/v1/evaluations/:evaluationId", () => {
  beforeEach(() => {
    resetEvaluationMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );

    await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ grade: 3 })
      .expect(401);
  });

  it("returns 400 when request body is missing", async () => {
    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .expect(400);

    expect(response.body).toMatchObject({ success: false, errorCode: "VALIDATION_FAILED" });
    expect(evalUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when body has no update fields", async () => {
    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({})
      .expect(400);

    expect(response.body.errors[0].message).toBe("No fields provided to update");
  });

  it("returns 400 when grade is out of range", async () => {
    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ grade: 0 })
      .expect(400);

    expect(response.body.errors[0].message).toBe("grade must be an integer between 1 and 5");
  });

  it("returns 400 when a string field is the wrong type", async () => {
    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ highlights: 123 })
      .expect(400);

    expect(response.body.errors[0].message).toBe("highlights must be a string");
  });

  it("returns 404 when the evaluation does not exist", async () => {
    evalFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ grade: 3 })
      .expect(404);

    expect(response.body).toMatchObject({ success: false, errorCode: "EVALUATION_NOT_FOUND" });
    expect(evalUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the authenticated user has no employee record", async () => {
    const reviewer = buildReviewerEmployee();
    evalFindFirstMock.mockResolvedValue(buildEvaluationRecord({ reviewerId: reviewer.id }));
    employeeFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ grade: 3 })
      .expect(403);

    expect(response.body).toMatchObject({ success: false, errorCode: "REVIEWER_NOT_EMPLOYEE" });
    expect(evalUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the user is not the reviewer for this evaluation", async () => {
    evalFindFirstMock.mockResolvedValue(
      buildEvaluationRecord({ reviewerId: "someone-else-id" }),
    );
    employeeFindUniqueMock.mockResolvedValue(buildReviewerEmployee());

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ grade: 3 })
      .expect(403);

    expect(response.body).toMatchObject({ success: false, errorCode: "NOT_EVALUATION_REVIEWER" });
    expect(evalUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 422 when the evaluation has already been sent", async () => {
    const reviewer = buildReviewerEmployee();
    evalFindFirstMock.mockResolvedValue(
      buildEvaluationRecord({ reviewerId: reviewer.id, isSent: true }),
    );
    employeeFindUniqueMock.mockResolvedValue(reviewer);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ grade: 3 })
      .expect(422);

    expect(response.body).toMatchObject({ success: false, errorCode: "EVALUATION_ALREADY_SENT" });
    expect(evalUpdateMock).not.toHaveBeenCalled();
  });

  it("updates and returns the evaluation with changed fields", async () => {
    const reviewer = buildReviewerEmployee();
    const existing = buildEvaluationRecord({ reviewerId: reviewer.id });
    const updated = { ...existing, grade: 5, highlights: "Outstanding results" };

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock.mockResolvedValue(reviewer);
    evalUpdateMock.mockResolvedValue(updated);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ grade: 5, highlights: "Outstanding results" })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { grade: 5, highlights: "Outstanding results" },
    });
  });

  it("returns 404 when the new revieweeId does not exist in the org", async () => {
    const reviewer = buildReviewerEmployee();
    const existing = buildEvaluationRecord({ reviewerId: reviewer.id });

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(null);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ revieweeId: "non-existent-employee" })
      .expect(404);

    expect(response.body).toMatchObject({ success: false, errorCode: "EMPLOYEE_NOT_FOUND" });
  });

  it("returns 403 when the reviewer is not the supervisor of the new reviewee", async () => {
    const reviewer = buildReviewerEmployee();
    const existing = buildEvaluationRecord({ reviewerId: reviewer.id });
    const newReviewee = { id: "other-emp", supervisorId: "different-supervisor-id" };

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(newReviewee);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ revieweeId: "other-emp" })
      .expect(403);

    expect(response.body).toMatchObject({ success: false, errorCode: "NOT_SUPERVISOR" });
  });

  it("marks evaluation as sent when send=true and sets sentAt and ackDeadline", async () => {
    const reviewer = buildReviewerEmployee();
    const existing = buildEvaluationRecord({ reviewerId: reviewer.id });
    const now = new Date();
    const sentRecord = {
      ...existing,
      isSent: true,
      sentAt: now,
      ackDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    };

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock.mockResolvedValue(reviewer);
    evalUpdateMock.mockResolvedValue(sentRecord);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}`)
      .send({ send: true })
      .expect(200);

    expect(response.body.data).toMatchObject({ isSent: true });
    expect(response.body.data.sentAt).not.toBeNull();
    expect(response.body.data.ackDeadline).not.toBeNull();

    const [updateCall] = evalUpdateMock.mock.calls;
    expect(updateCall[0].data).toMatchObject({ isSent: true });
    expect(updateCall[0].data.sentAt).toBeDefined();
  });
});
