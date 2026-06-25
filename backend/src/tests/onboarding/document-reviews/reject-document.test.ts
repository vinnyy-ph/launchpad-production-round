import request from "supertest";
import { app } from "../../../app";
import { NotificationsService } from "../../../modules/notifications/notifications.service";
import {
  EMPLOYEE_ID,
  SUBMISSION_ID,
  buildHrUser,
  buildRejectDocumentBody,
  buildSubmissionRecord,
  onboardingDocumentSubmissionFindUniqueMock,
  onboardingDocumentSubmissionUpdateMock,
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

describe("PATCH /api/v1/onboarding/document-reviews/:submissionId/reject", () => {
  let notifyRejectedSpy: jest.SpyInstance;

  beforeEach(() => {
    resetDocumentReviewMocks();
    notifyRejectedSpy = jest
      .spyOn(NotificationsService.prototype, "notifyEmployeeDocumentRejected")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    notifyRejectedSpy.mockRestore();
  });

  it("rejects a pending document submission with a note", async () => {
    onboardingDocumentSubmissionFindUniqueMock.mockResolvedValue(
      buildSubmissionRecord(),
    );
    onboardingDocumentSubmissionUpdateMock.mockResolvedValue(
      buildSubmissionRecord({
        status: "REJECTED",
        reviewerId: "hr-employee-id",
        rejectionNote:
          "The NBI Clearance scan is too blurry to read. Please upload a clearer PDF copy issued within the last 6 months.",
        reviewedAt: new Date("2026-06-17T11:00:00.000Z"),
      }),
    );

    const response = await request(app)
      .patch(`/api/v1/onboarding/document-reviews/${SUBMISSION_ID}/reject`)
      .send(buildRejectDocumentBody())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Document submission rejected successfully",
      data: {
        id: SUBMISSION_ID,
        status: "rejected",
        rejectionNote:
          "The NBI Clearance scan is too blurry to read. Please upload a clearer PDF copy issued within the last 6 months.",
      },
    });

    expect(onboardingDocumentSubmissionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SUBMISSION_ID },
        data: expect.objectContaining({
          status: "REJECTED",
          reviewerId: "hr-employee-id",
        }),
      }),
    );

    expect(notifyRejectedSpy).toHaveBeenCalledWith(
      EMPLOYEE_ID,
      "NBI Clearance",
      expect.any(String),
    );
  });

  it("returns 400 when rejectionNote is missing", async () => {
    const response = await request(app)
      .patch(`/api/v1/onboarding/document-reviews/${SUBMISSION_ID}/reject`)
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
    });

    expect(onboardingDocumentSubmissionFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the submission was already rejected", async () => {
    onboardingDocumentSubmissionFindUniqueMock.mockResolvedValue(
      buildSubmissionRecord({
        status: "REJECTED",
        rejectionNote: "Previous rejection note.",
        reviewerId: "hr-employee-id",
        reviewedAt: new Date("2026-06-17T11:00:00.000Z"),
      }),
    );

    const response = await request(app)
      .patch(`/api/v1/onboarding/document-reviews/${SUBMISSION_ID}/reject`)
      .send(buildRejectDocumentBody())
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "SUBMISSION_ALREADY_REVIEWED",
    });

    expect(onboardingDocumentSubmissionUpdateMock).not.toHaveBeenCalled();
  });
});
