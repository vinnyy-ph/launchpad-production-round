import request from "supertest";
import { app } from "../../../app";
import {
  buildCreateDocumentBody,
  buildDocumentRecord,
  buildHrUser,
  onboardingDocumentCreateMock,
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

describe("POST /api/v1/onboarding/documents - create document", () => {
  beforeEach(() => {
    resetDocumentMocks();
  });

  it("creates a required document and returns 201", async () => {
    onboardingDocumentCreateMock.mockResolvedValue(buildDocumentRecord());

    const response = await request(app)
      .post("/api/v1/onboarding/documents")
      .send(buildCreateDocumentBody())
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Required document created successfully",
      data: {
        id: "document-id",
        documentName: "NBI Clearance",
        instructions:
          "Upload a clear scanned copy of your NBI Clearance issued within the last 6 months.",
        allowedFileTypes: "pdf",
        isRequired: true,
      },
    });

    expect(onboardingDocumentCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateId: "template-id",
          documentName: "NBI Clearance",
          allowedFileTypes: "pdf",
          isRequired: true,
        }),
      }),
    );
  });

  it("returns 400 when documentName is missing", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding/documents")
      .send({
        allowedFileTypes: "pdf",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
    });
  });

  it("returns 400 when allowedFileTypes contains an unsupported extension", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding/documents")
      .send({
        documentName: "NBI Clearance",
        allowedFileTypes: "exe",
      })
      .expect(400);

    expect(response.body.errors[0]).toMatchObject({
      field: "allowedFileTypes",
      message: "Invalid allowedFileTypes",
    });
  });
});
