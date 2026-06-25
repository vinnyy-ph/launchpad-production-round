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

// Shared mock functions defined inside the factory — safe from the jest.mock hoisting TDZ.
// Retrieve them at test time via jest.requireMock so we can assert on them.
jest.mock("../../core/cloudinary/cloudinary.service", () => {
  const signerMock = jest.fn().mockReturnValue("/api/v1/documents/view/doc.pdf?token=signed");
  const uploaderMock = jest.fn();
  return {
    CloudinaryService: jest.fn().mockImplementation(() => ({
      uploadSupportingDocument: uploaderMock,
      getSupportingDocumentProxyPath: signerMock,
    })),
    __signerMock: signerMock,
  };
});

function getSignerMock(): jest.Mock {
  return (jest.requireMock("../../core/cloudinary/cloudinary.service") as { __signerMock: jest.Mock }).__signerMock;
}

const EVAL_ID = "eval-001";

describe("GET /api/v1/evaluations/:evaluationId/documents/:docIndex/download", () => {
  beforeEach(() => {
    resetEvaluationMocks();
    getSignerMock().mockClear();
  });

  it("returns the raw link url directly without proxying through Cloudinary", async () => {
    const reviewer = buildReviewerEmployee();
    const existing = {
      ...buildEvaluationRecord({ reviewerId: reviewer.id }),
      supportingDocs: [{ kind: "link", url: "https://drive.google.com/x", label: "Plan" }],
    };

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock.mockResolvedValue(reviewer);

    const response = await request(app)
      .get(`/api/v1/evaluations/${EVAL_ID}/documents/0/download`)
      .expect(200);

    expect(response.body.url).toBe("https://drive.google.com/x");
    expect(getSignerMock()).not.toHaveBeenCalled();
  });

  it("returns a proxy url for a file entry by passing the public_id to the proxy builder", async () => {
    const reviewer = buildReviewerEmployee();
    const existing = {
      ...buildEvaluationRecord({ reviewerId: reviewer.id }),
      supportingDocs: [{ kind: "file", url: "supporting_docs/report.pdf", label: "report.pdf" }],
    };

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock.mockResolvedValue(reviewer);

    const response = await request(app)
      .get(`/api/v1/evaluations/${EVAL_ID}/documents/0/download`)
      .expect(200);

    expect(getSignerMock()).toHaveBeenCalledWith("supporting_docs/report.pdf");
    expect(response.body.url).toBe("/api/v1/documents/view/doc.pdf?token=signed");
  });

  it("returns 404 when docIndex is out of range", async () => {
    const reviewer = buildReviewerEmployee();
    const existing = {
      ...buildEvaluationRecord({ reviewerId: reviewer.id }),
      supportingDocs: [{ kind: "link", url: "https://example.com", label: "example.com" }],
    };

    evalFindFirstMock.mockResolvedValue(existing);
    employeeFindUniqueMock.mockResolvedValue(reviewer);

    await request(app)
      .get(`/api/v1/evaluations/${EVAL_ID}/documents/5/download`)
      .expect(404);
  });
});
