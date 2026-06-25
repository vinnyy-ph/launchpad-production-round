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
    evaluationAcknowledgement: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../core/cloudinary/cloudinary.service", () => ({
  CloudinaryService: jest.fn().mockImplementation(() => ({
    uploadSupportingDocument: jest.fn(),
  })),
}));

const URL = "/api/v1/evaluations";
const SCRIPT = "<script>alert(1)</script>";
const VALID_BODY = {
  revieweeId: "emp-reviewee-id",
  periodStart: "2026-01-01",
  periodEnd: "2026-03-31",
  grade: 4,
};

describe("Evaluation text-field input validation", () => {
  beforeEach(() => {
    resetEvaluationMocks();
  });

  // ─── Create: HTML/script rejection ──────────────────────────────────────────

  it("returns 400 when evaluation contains a script tag", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, evaluation: SCRIPT })
      .expect(400);

    expect(response.body).toMatchObject({ success: false, errorCode: "VALIDATION_FAILED" });
    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when recommendation contains an img/onerror payload", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, recommendation: "<img src=x onerror=alert(1)>" })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when a highlights item contains a script tag", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, highlights: ["Shipped on time", SCRIPT] })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when a lowlights item contains a script tag", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, lowlights: [SCRIPT] })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  // ─── Create: length caps ────────────────────────────────────────────────────

  it("returns 400 when evaluation exceeds the max length", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, evaluation: "x".repeat(5001) })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/5000 characters or fewer/);
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when a highlights item exceeds the max length", async () => {
    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, highlights: ["x".repeat(1001)] })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/1000 characters or fewer/);
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  // ─── Create: benign content still succeeds ──────────────────────────────────

  it("accepts benign comparison characters in the evaluation and creates the record", async () => {
    const reviewer = buildReviewerEmployee();
    const reviewee = buildRevieweeEmployee(reviewer.id);
    const evaluation = buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: reviewee.id });

    employeeFindUniqueMock.mockResolvedValueOnce(reviewer).mockResolvedValueOnce(reviewee);
    evalCreateMock.mockResolvedValue(evaluation);

    const response = await request(app)
      .post(URL)
      .send({ ...VALID_BODY, evaluation: "Throughput a < b improved; 5 > 3 on KPIs" })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(evalCreateMock).toHaveBeenCalled();
  });

  // ─── Update: HTML/script rejection ──────────────────────────────────────────

  it("returns 400 when an update sets recommendation containing a script tag", async () => {
    const response = await request(app)
      .patch(`${URL}/eval-001`)
      .send({ recommendation: SCRIPT })
      .expect(400);

    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
  });
});
