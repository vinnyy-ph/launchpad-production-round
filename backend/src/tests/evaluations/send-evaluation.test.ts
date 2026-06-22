import request from "supertest";
import { app } from "../../app";
import {
  buildEvaluationRecord,
  buildReviewerEmployee,
  evalFindFirstMock,
  evalUpdateMock,
  evalAcknowledgementCreateMock,
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
    evaluationAcknowledgement: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../core/email", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
  })),
}));

const EVAL_ID = "eval-001";

describe("PATCH /api/v1/evaluations/:evaluationId/send", () => {
  beforeEach(() => {
    resetEvaluationMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );

    await request(app).patch(`/api/v1/evaluations/${EVAL_ID}/send`).expect(401);
  });

  it("returns 404 when the evaluation does not exist", async () => {
    evalFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}/send`)
      .expect(404);

    expect(response.body).toMatchObject({ success: false, errorCode: "EVALUATION_NOT_FOUND" });
    expect(evalUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the authenticated user has no employee record", async () => {
    const reviewer = buildReviewerEmployee();
    evalFindFirstMock.mockResolvedValue(buildEvaluationRecord({ reviewerId: reviewer.id }));
    employeeFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}/send`)
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
      .patch(`/api/v1/evaluations/${EVAL_ID}/send`)
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
      .patch(`/api/v1/evaluations/${EVAL_ID}/send`)
      .expect(422);

    expect(response.body).toMatchObject({ success: false, errorCode: "EVALUATION_ALREADY_SENT" });
    expect(evalUpdateMock).not.toHaveBeenCalled();
  });

  it("marks the evaluation as sent and returns success with sentAt and ackDeadline", async () => {
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
    evalAcknowledgementCreateMock.mockResolvedValue({
      id: "ack-001",
      evaluationId: EVAL_ID,
      employeeId: sentRecord.revieweeId,
      isDeemedAck: false,
      acknowledgedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}/send`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Evaluation sent successfully",
      data: { isSent: true },
    });
    expect(response.body.data.sentAt).not.toBeNull();
    expect(response.body.data.ackDeadline).not.toBeNull();

    const [updateCall] = evalUpdateMock.mock.calls;
    expect(updateCall[0]).toMatchObject({ where: { id: EVAL_ID } });
    expect(updateCall[0].data).toMatchObject({ isSent: true });
    expect(updateCall[0].data.sentAt).toBeDefined();
    expect(updateCall[0].data.ackDeadline).toBeDefined();
  });
});
