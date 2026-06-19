import request from "supertest";
import { app } from "../../../app";
import { NotificationsService } from "../../../modules/notifications/notifications.service";
import {
  EMPLOYEE_ID,
  SUBMISSION_ID,
  buildHrUser,
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

describe("PATCH /api/v1/onboarding/document-reviews/:submissionId/approve", () => {
  let notifyApprovedSpy: jest.SpyInstance;

  beforeEach(() => {
    resetDocumentReviewMocks();
    notifyApprovedSpy = jest
      .spyOn(NotificationsService.prototype, "notifyEmployeeDocumentApproved")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    notifyApprovedSpy.mockRestore();
  });

  it("approves a pending document submission", async () => {
    onboardingDocumentSubmissionFindUniqueMock.mockResolvedValue(
      buildSubmissionRecord(),
    );
    onboardingDocumentSubmissionUpdateMock.mockResolvedValue(
      buildSubmissionRecord({
        status: "APPROVED",
        reviewerId: "hr-employee-id",
        reviewedAt: new Date("2026-06-17T11:00:00.000Z"),
      }),
    );

    const response = await request(app)
      .patch(`/api/v1/onboarding/document-reviews/${SUBMISSION_ID}/approve`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Document submission approved successfully",
      data: {
        id: SUBMISSION_ID,
        status: "approved",
        reviewerId: "hr-employee-id",
      },
    });

    expect(onboardingDocumentSubmissionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SUBMISSION_ID },
        data: expect.objectContaining({
          status: "APPROVED",
          reviewerId: "hr-employee-id",
          rejectionNote: null,
        }),
      }),
    );

    expect(notifyApprovedSpy).toHaveBeenCalledWith(EMPLOYEE_ID, "NBI Clearance");
  });

  it("returns 404 when the submission does not exist", async () => {
    onboardingDocumentSubmissionFindUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/onboarding/document-reviews/${SUBMISSION_ID}/approve`)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "SUBMISSION_NOT_FOUND",
    });
  });

  it("returns 409 when the submission was already approved", async () => {
    onboardingDocumentSubmissionFindUniqueMock.mockResolvedValue(
      buildSubmissionRecord({
        status: "APPROVED",
        reviewerId: "hr-employee-id",
        reviewedAt: new Date("2026-06-17T11:00:00.000Z"),
      }),
    );

    const response = await request(app)
      .patch(`/api/v1/onboarding/document-reviews/${SUBMISSION_ID}/approve`)
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "SUBMISSION_ALREADY_REVIEWED",
    });

    expect(onboardingDocumentSubmissionUpdateMock).not.toHaveBeenCalled();
  });
});
