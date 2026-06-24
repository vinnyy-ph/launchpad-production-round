import request from "supertest";
import { app } from "../../../app";
import {
  buildSubmissionRecord,
  buildHrUser,
  onboardingDocumentSubmissionFindManyMock,
  resetDocumentReviewMocks,
} from "./document-reviews-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../../core/cloudinary", () => ({
  CloudinaryService: jest.fn().mockImplementation(() => ({
    resolveOnboardingDocumentViewUrl: (stored: string) =>
      `https://signed.example.test/${encodeURIComponent(stored)}`,
  })),
}));

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    employee: { findUnique: jest.fn() },
    onboardingDocumentSubmission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("GET /api/v1/onboarding/document-reviews - list submissions", () => {
  beforeEach(() => {
    resetDocumentReviewMocks();
  });

  it("returns all document submissions for HR review", async () => {
    onboardingDocumentSubmissionFindManyMock.mockResolvedValue([
      buildSubmissionRecord(),
    ]);

    const response = await request(app)
      .get("/api/v1/onboarding/document-reviews")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Document submissions retrieved successfully",
      data: [
        {
          id: "submission-id",
          documentName: "NBI Clearance",
          status: "pending",
          employee: {
            firstName: "Maria",
            lastName: "Santos",
            fullName: "Maria Cruz Santos",
            companyEmail: "maria.santos@launchpad.ph",
          },
        },
      ],
    });

    expect(onboardingDocumentSubmissionFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      }),
    );
  });

  it("filters submissions by pending status", async () => {
    onboardingDocumentSubmissionFindManyMock.mockResolvedValue([
      buildSubmissionRecord(),
    ]);

    await request(app)
      .get("/api/v1/onboarding/document-reviews")
      .query({ status: "pending" })
      .expect(200);

    expect(onboardingDocumentSubmissionFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
      }),
    );
  });

  it("returns an empty list when no submissions exist", async () => {
    onboardingDocumentSubmissionFindManyMock.mockResolvedValue([]);

    const response = await request(app)
      .get("/api/v1/onboarding/document-reviews")
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  it("returns 400 for an invalid status filter", async () => {
    const response = await request(app)
      .get("/api/v1/onboarding/document-reviews")
      .query({ status: "invalid" })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
    });
  });
});
