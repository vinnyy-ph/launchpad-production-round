import request from "supertest";
import { app } from "../../app";
import {
  buildEvaluationRecord,
  buildReviewerEmployee,
  evalFindFirstMock,
  evalAcknowledgementUpdateMock,
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
    evaluationAcknowledgement: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const EVAL_ID = "eval-001";
const DAY_MS = 24 * 60 * 60 * 1000;

describe("Deemed-acknowledgement settles lazily on read (GET /api/v1/evaluations/:evaluationId)", () => {
  beforeEach(() => {
    resetEvaluationMocks();
  });

  it("flips an unacknowledged sent evaluation to deemed-acknowledged once its ackDeadline has passed", async () => {
    const reviewer = buildReviewerEmployee();
    const existing = buildEvaluationRecord({
      reviewerId: reviewer.id,
      isSent: true,
      sentAt: new Date(Date.now() - 8 * DAY_MS),
      ackDeadline: new Date(Date.now() - DAY_MS),
      acknowledgement: { isDeemedAck: false, acknowledgedAt: null },
    });

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock.mockResolvedValue(reviewer);
    evalAcknowledgementUpdateMock.mockResolvedValue({});

    const response = await request(app).get(`/api/v1/evaluations/${EVAL_ID}`).expect(200);

    expect(response.body.acknowledgement).toMatchObject({ isDeemedAck: true, acknowledgedAt: null });
    expect(evalAcknowledgementUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { evaluationId: EVAL_ID }, data: { isDeemedAck: true } }),
    );
  });

  it("does not flip while the ackDeadline is still in the future", async () => {
    const reviewer = buildReviewerEmployee();
    const existing = buildEvaluationRecord({
      reviewerId: reviewer.id,
      isSent: true,
      sentAt: new Date(Date.now() - DAY_MS),
      ackDeadline: new Date(Date.now() + 6 * DAY_MS),
      acknowledgement: { isDeemedAck: false, acknowledgedAt: null },
    });

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock.mockResolvedValue(reviewer);

    const response = await request(app).get(`/api/v1/evaluations/${EVAL_ID}`).expect(200);

    expect(response.body.acknowledgement).toMatchObject({ isDeemedAck: false });
    expect(evalAcknowledgementUpdateMock).not.toHaveBeenCalled();
  });

  it("leaves an explicitly acknowledged evaluation untouched even past the deadline", async () => {
    const reviewer = buildReviewerEmployee();
    const acknowledgedAt = new Date(Date.now() - 9 * DAY_MS);
    const existing = buildEvaluationRecord({
      reviewerId: reviewer.id,
      isSent: true,
      sentAt: new Date(Date.now() - 10 * DAY_MS),
      ackDeadline: new Date(Date.now() - 3 * DAY_MS),
      acknowledgement: { isDeemedAck: false, acknowledgedAt },
    });

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock.mockResolvedValue(reviewer);

    const response = await request(app).get(`/api/v1/evaluations/${EVAL_ID}`).expect(200);

    expect(response.body.acknowledgement).toMatchObject({ isDeemedAck: false });
    expect(evalAcknowledgementUpdateMock).not.toHaveBeenCalled();
  });
});
