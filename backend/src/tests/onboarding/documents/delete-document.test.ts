import request from "supertest";
import { app } from "../../../app";
import {
  buildDocumentRecord,
  buildHrUser,
  DOCUMENT_ID,
  onboardingDocumentDeleteMock,
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

describe("DELETE /api/v1/onboarding/documents/:id - delete document", () => {
  beforeEach(() => {
    resetDocumentMocks();
  });

  it("deletes a required document", async () => {
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());
    onboardingDocumentDeleteMock.mockResolvedValue(buildDocumentRecord());

    const response = await request(app)
      .delete(`/api/v1/onboarding/documents/${DOCUMENT_ID}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Required document deleted successfully",
      data: {
        id: DOCUMENT_ID,
        documentName: "NBI Clearance",
      },
    });
  });

  it("returns 404 when deleting a missing document", async () => {
    onboardingDocumentFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/v1/onboarding/documents/missing-id")
      .expect(404);

    expect(response.body.errorCode).toBe("DOCUMENT_NOT_FOUND");
  });
});
