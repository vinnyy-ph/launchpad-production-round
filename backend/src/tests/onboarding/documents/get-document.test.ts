import request from "supertest";
import { app } from "../../../app";
import {
  buildDocumentRecord,
  buildHrUser,
  DOCUMENT_ID,
  onboardingDocumentFindFirstMock,
  resetDocumentMocks,
} from "./documents-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    onboardingTemplate: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    onboardingDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("GET /api/v1/onboarding/documents/:id - get document", () => {
  beforeEach(() => {
    resetDocumentMocks();
  });

  it("returns a required document by ID", async () => {
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());

    const response = await request(app)
      .get(`/api/v1/onboarding/documents/${DOCUMENT_ID}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Required document retrieved successfully",
      data: {
        id: DOCUMENT_ID,
        documentName: "NBI Clearance",
      },
    });
  });

  it("returns 404 when the document does not exist", async () => {
    onboardingDocumentFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/v1/onboarding/documents/missing-id")
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Required document not found",
      errorCode: "DOCUMENT_NOT_FOUND",
    });
  });
});
