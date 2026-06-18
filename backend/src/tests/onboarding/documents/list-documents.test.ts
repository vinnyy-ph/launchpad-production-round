import request from "supertest";
import { app } from "../../../app";
import {
  buildDocumentRecord,
  buildHrUser,
  onboardingDocumentFindManyMock,
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

describe("GET /api/v1/onboarding/documents - list documents", () => {
  beforeEach(() => {
    resetDocumentMocks();
  });

  it("returns all required documents on the default template", async () => {
    onboardingDocumentFindManyMock.mockResolvedValue([
      buildDocumentRecord(),
      buildDocumentRecord({
        id: "document-id-2",
        documentName: "SSS E-1 Form",
        instructions: "Submit your SSS E-1 or E-4 form showing your SSS number.",
        allowedFileTypes: "pdf",
      }),
    ]);

    const response = await request(app)
      .get("/api/v1/onboarding/documents")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Required documents retrieved successfully",
    });
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      documentName: "NBI Clearance",
      allowedFileTypes: "pdf",
    });
    expect(response.body.data[1]).toMatchObject({
      documentName: "SSS E-1 Form",
    });
  });
});
