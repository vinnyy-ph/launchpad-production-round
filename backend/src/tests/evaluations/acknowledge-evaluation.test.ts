import request from "supertest";
import { app } from "../../app";
import {
  buildEvaluationRecord,
  buildReviewerEmployee,
  buildRevieweeEmployee,
  evalFindFirstMock,
  evalAcknowledgementUpdateMock,
  employeeFindUniqueMock,
  resetEvaluationMocks,
} from "./evaluations-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-reviewee-user-id" };
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

const EVAL_ID = "eval-001";
const REVIEWER = buildReviewerEmployee();
const REVIEWEE = buildRevieweeEmployee(REVIEWER.id, { id: "emp-reviewee-id" });

describe("PATCH /api/v1/evaluations/:evaluationId/acknowledge", () => {
  beforeEach(() => {
    resetEvaluationMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    (authMock.authenticate as jest.Mock).mockImplementationOnce(
      (_req: unknown, _res: unknown, next: () => void) => next(),
    );

    await request(app).patch(`/api/v1/evaluations/${EVAL_ID}/acknowledge`).expect(401);
  });

  it("returns 404 when the evaluation does not exist", async () => {
    evalFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}/acknowledge`)
      .expect(404);

    expect(response.body).toMatchObject({ success: false, errorCode: "EVALUATION_NOT_FOUND" });
  });

  it("returns 403 when the caller has no employee record", async () => {
    evalFindFirstMock.mockResolvedValue(
      buildEvaluationRecord({
        reviewerId: REVIEWER.id,
        revieweeId: REVIEWEE.id,
        isSent: true,
        acknowledgement: { isDeemedAck: false, acknowledgedAt: null },
      }),
    );
    employeeFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}/acknowledge`)
      .expect(403);

    expect(response.body).toMatchObject({ success: false, errorCode: "REVIEWEE_NOT_EMPLOYEE" });
    expect(evalAcknowledgementUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is not the reviewee", async () => {
    evalFindFirstMock.mockResolvedValue(
      buildEvaluationRecord({
        reviewerId: REVIEWER.id,
        revieweeId: REVIEWEE.id,
        isSent: true,
        acknowledgement: { isDeemedAck: false, acknowledgedAt: null },
      }),
    );
    employeeFindUniqueMock.mockResolvedValue({ id: "some-other-employee-id", userId: "test-reviewee-user-id" });

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}/acknowledge`)
      .expect(403);

    expect(response.body).toMatchObject({ success: false, errorCode: "NOT_EVALUATION_REVIEWEE" });
    expect(evalAcknowledgementUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 422 when the evaluation has not been sent yet", async () => {
    evalFindFirstMock.mockResolvedValue(
      buildEvaluationRecord({ reviewerId: REVIEWER.id, revieweeId: REVIEWEE.id, isSent: false }),
    );
    employeeFindUniqueMock.mockResolvedValue({ id: REVIEWEE.id, userId: "test-reviewee-user-id" });

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}/acknowledge`)
      .expect(422);

    expect(response.body).toMatchObject({ success: false, errorCode: "EVALUATION_NOT_SENT" });
    expect(evalAcknowledgementUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 422 when the evaluation is already acknowledged", async () => {
    const acknowledgedAt = new Date("2026-06-17T10:00:00.000Z");
    evalFindFirstMock.mockResolvedValue(
      buildEvaluationRecord({
        reviewerId: REVIEWER.id,
        revieweeId: REVIEWEE.id,
        isSent: true,
        acknowledgement: { isDeemedAck: false, acknowledgedAt },
      }),
    );
    employeeFindUniqueMock.mockResolvedValue({ id: REVIEWEE.id, userId: "test-reviewee-user-id" });

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}/acknowledge`)
      .expect(422);

    expect(response.body).toMatchObject({ success: false, errorCode: "EVALUATION_ALREADY_ACKNOWLEDGED" });
    expect(evalAcknowledgementUpdateMock).not.toHaveBeenCalled();
  });

  it("acknowledges the evaluation and returns the updated evaluation with acknowledgement", async () => {
    const acknowledgedAt = new Date("2026-06-17T12:00:00.000Z");
    evalFindFirstMock.mockResolvedValue(
      buildEvaluationRecord({
        reviewerId: REVIEWER.id,
        revieweeId: REVIEWEE.id,
        isSent: true,
        acknowledgement: { isDeemedAck: false, acknowledgedAt: null },
      }),
    );
    employeeFindUniqueMock.mockResolvedValue({ id: REVIEWEE.id, userId: "test-reviewee-user-id" });
    evalAcknowledgementUpdateMock.mockResolvedValue({
      id: "ack-001",
      evaluationId: EVAL_ID,
      employeeId: REVIEWEE.id,
      isDeemedAck: false,
      acknowledgedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .patch(`/api/v1/evaluations/${EVAL_ID}/acknowledge`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Evaluation acknowledged successfully",
      data: {
        id: EVAL_ID,
        isSent: true,
        acknowledgement: {
          isDeemedAck: false,
          acknowledgedAt: acknowledgedAt.toISOString(),
        },
      },
    });
    expect(evalAcknowledgementUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { evaluationId: EVAL_ID } }),
    );
  });
});
