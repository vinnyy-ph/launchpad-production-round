import request from "supertest";
import { app } from "../../app";
import {
  buildEvaluationRecord,
  buildRevieweeEmployee,
  buildReviewerEmployee,
  evalCreateMock,
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

jest.mock("../../core/cloudinary/cloudinary.service", () => ({
  CloudinaryService: jest.fn().mockImplementation(() => ({
    uploadSupportingDocument: jest.fn().mockResolvedValue("https://res.cloudinary.com/test/supporting_docs/doc.pdf"),
  })),
}));

const VALID_BODY = {
  revieweeId: "emp-reviewee-id",
  periodStart: "2026-01-01",
  periodEnd: "2026-03-31",
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
      .send({ periodStart: "2026-01-01", periodEnd: "2026-03-31", grade: 4 })
      .expect(400);

    expect(response.body.errors[0].message).toBe("revieweeId is required");
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when periodStart is missing", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ revieweeId: "emp-reviewee-id", periodEnd: "2026-03-31", grade: 4 })
      .expect(400);

    expect(response.body.errors[0].message).toBe("periodStart is required");
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when periodEnd is before periodStart", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, periodStart: "2026-03-31", periodEnd: "2026-01-01" })
      .expect(400);

    expect(response.body.errors[0].message).toBe("periodEnd must be after periodStart");
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when periodEnd equals periodStart (no same-day period)", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, periodStart: "2026-01-01", periodEnd: "2026-01-01" })
      .expect(400);

    expect(response.body.errors[0].message).toBe("periodEnd must be after periodStart");
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when periodEnd is in the future", async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const futureStr = future.toISOString().slice(0, 10);

    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, periodEnd: futureStr })
      .expect(400);

    expect(response.body.errors[0].message).toBe("periodEnd cannot be in the future");
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when periodStart is in the future", async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const futureStart = future.toISOString().slice(0, 10);
    future.setDate(future.getDate() + 1);
    const futureEnd = future.toISOString().slice(0, 10);

    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, periodStart: futureStart, periodEnd: futureEnd })
      .expect(400);

    expect(response.body.errors[0].message).toBe("periodStart cannot be in the future");
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
    evalAcknowledgementCreateMock.mockResolvedValue({
      id: "ack-001",
      evaluationId: sentEvaluation.id,
      employeeId: reviewee.id,
      isDeemedAck: false,
      acknowledgedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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

  it("uploads up to 5 PDF files and returns their docs in supportingDocs", async () => {
    const reviewer = buildReviewerEmployee();
    const reviewee = buildRevieweeEmployee(reviewer.id);
    const evaluation = buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: reviewee.id });

    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(reviewee);
    evalCreateMock.mockResolvedValue({ ...evaluation, supportingDocs: [
      { kind: "file", url: "https://res.cloudinary.com/test/supporting_docs/doc1.pdf", label: "doc1.pdf" },
      { kind: "file", url: "https://res.cloudinary.com/test/supporting_docs/doc2.pdf", label: "doc2.pdf" },
      { kind: "file", url: "https://res.cloudinary.com/test/supporting_docs/doc3.pdf", label: "doc3.pdf" },
      { kind: "file", url: "https://res.cloudinary.com/test/supporting_docs/doc4.pdf", label: "doc4.pdf" },
      { kind: "file", url: "https://res.cloudinary.com/test/supporting_docs/doc5.pdf", label: "doc5.pdf" },
    ]});

    const response = await request(app)
      .post("/api/v1/evaluations")
      .field("revieweeId", "emp-reviewee-id")
      .field("periodStart", "2026-01-01")
      .field("periodEnd", "2026-03-31")
      .field("grade", "4")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc1.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc2.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc3.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc4.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc5.pdf")
      .expect(201);

    expect(response.body.data.supportingDocs).toHaveLength(5);
  });

  it("accepts a valid link and persists it as a link doc", async () => {
    const reviewer = buildReviewerEmployee();
    const reviewee = buildRevieweeEmployee(reviewer.id);
    const evaluation = buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: reviewee.id });

    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(reviewee);
    evalCreateMock.mockResolvedValue(evaluation);

    await request(app)
      .post("/api/v1/evaluations")
      .field("revieweeId", "emp-reviewee-id")
      .field("periodStart", "2026-01-01")
      .field("periodEnd", "2026-03-31")
      .field("grade", "4")
      .field("links", JSON.stringify({ url: "https://drive.google.com/x", label: "Plan" }))
      .expect(201);

    const created = evalCreateMock.mock.calls[0][0].data;
    expect(created.supportingDocs).toContainEqual({
      kind: "link",
      url: "https://drive.google.com/x",
      label: "Plan",
    });
  });

  it("returns 400 INVALID_URL when a link uses http and does not call create", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .field("revieweeId", "emp-reviewee-id")
      .field("periodStart", "2026-01-01")
      .field("periodEnd", "2026-03-31")
      .field("grade", "4")
      .field("links", JSON.stringify({ url: "http://insecure.com" }))
      .expect(400);

    expect(response.body.message).toBe("Supporting link must be a valid https URL");
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 TOO_MANY_DOCS when files + links exceed 5", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .field("revieweeId", "emp-reviewee-id")
      .field("periodStart", "2026-01-01")
      .field("periodEnd", "2026-03-31")
      .field("grade", "4")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc1.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc2.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc3.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc4.pdf")
      .field("links", JSON.stringify({ url: "https://example.com/a" }))
      .field("links", JSON.stringify({ url: "https://example.com/b" }))
      .expect(400);

    expect(response.body.message).toBe("Too many supporting documents — maximum 5 (files + links) allowed");
    expect(evalCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when more than 5 files are attached", async () => {
    const response = await request(app)
      .post("/api/v1/evaluations")
      .field("revieweeId", "emp-reviewee-id")
      .field("periodStart", "2026-01-01")
      .field("periodEnd", "2026-03-31")
      .field("grade", "4")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc1.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc2.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc3.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc4.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc5.pdf")
      .attach("files", Buffer.from("%PDF-1.4 test"), "doc6.pdf")
      .expect(400);

    expect(response.body).toMatchObject({ success: false, errorCode: "VALIDATION_FAILED" });
  });

  it("persists optional fields when provided", async () => {
    const reviewer = buildReviewerEmployee();
    const reviewee = buildRevieweeEmployee(reviewer.id);
    const withOptionals = {
      ...buildEvaluationRecord({ reviewerId: reviewer.id, revieweeId: reviewee.id }),
      highlights: ["Delivered ahead of schedule"],
      lowlights: ["Could improve documentation"],
    };

    employeeFindUniqueMock
      .mockResolvedValueOnce(reviewer)
      .mockResolvedValueOnce(reviewee);
    evalCreateMock.mockResolvedValue(withOptionals);

    const response = await request(app)
      .post("/api/v1/evaluations")
      .send({ ...VALID_BODY, highlights: ["Delivered ahead of schedule"], lowlights: ["Could improve documentation"] })
      .expect(201);

    expect(response.body.data).toMatchObject({
      highlights: ["Delivered ahead of schedule"],
      lowlights: ["Could improve documentation"],
    });
  });
});
