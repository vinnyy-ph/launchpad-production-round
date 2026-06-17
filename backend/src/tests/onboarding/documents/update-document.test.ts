import request from "supertest";
import { app } from "../../../app";
import {
  buildDocumentRecord,
  buildHrUser,
  DOCUMENT_ID,
  onboardingDocumentFindFirstMock,
  onboardingDocumentUpdateMock,
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

describe("PUT /api/v1/onboarding/documents/:id - update document", () => {
  beforeEach(() => {
    resetDocumentMocks();
  });

  it("updates a required document", async () => {
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());
    onboardingDocumentUpdateMock.mockResolvedValue(
      buildDocumentRecord({
        documentName: "PhilHealth MDR",
        instructions: "Provide your PhilHealth Member Data Record.",
        allowedFileTypes: "pdf,jpg,png",
      }),
    );

    const response = await request(app)
      .put(`/api/v1/onboarding/documents/${DOCUMENT_ID}`)
      .send({
        documentName: "PhilHealth MDR",
        instructions: "Provide your PhilHealth Member Data Record.",
        allowedFileTypes: "pdf,jpg,png",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Required document updated successfully",
      data: {
        documentName: "PhilHealth MDR",
        allowedFileTypes: "pdf,jpg,png",
      },
    });
  });

  it("returns 404 when updating a missing document", async () => {
    onboardingDocumentFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .put("/api/v1/onboarding/documents/missing-id")
      .send({
        documentName: "PhilHealth MDR",
        allowedFileTypes: "pdf",
      })
      .expect(404);

    expect(response.body.errorCode).toBe("DOCUMENT_NOT_FOUND");
  });

  it("returns 400 when allowedFileTypes is invalid", async () => {
    const response = await request(app)
      .put(`/api/v1/onboarding/documents/${DOCUMENT_ID}`)
      .send({
        documentName: "PhilHealth MDR",
        allowedFileTypes: "zip",
      })
      .expect(400);

    expect(response.body.errorCode).toBe("VALIDATION_FAILED");
  });
});
