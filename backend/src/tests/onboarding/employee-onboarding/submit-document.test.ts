import request from "supertest";
import { app } from "../../../app";
import {
  DOCUMENT_ID,
  buildDocumentRecord,
  buildEmployeeUser,
  buildOnboardingRecord,
  buildSubmissionRecord,
  buildSubmitDocumentBody,
  onboardingDocumentFindFirstMock,
  onboardingDocumentSubmissionCreateMock,
  onboardingDocumentSubmissionFindFirstMock,
  onboardingRecordFindFirstMock,
  resetEmployeeOnboardingMocks,
} from "./employee-onboarding-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildEmployeeUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    onboardingRecord: { findFirst: jest.fn(), update: jest.fn() },
    onboardingInvitation: { findFirst: jest.fn(), update: jest.fn() },
    employee: { findMany: jest.fn(), update: jest.fn() },
    onboardingDocument: { findFirst: jest.fn() },
    onboardingDocumentSubmission: { findFirst: jest.fn(), create: jest.fn() },
    onboardingCustomField: { findMany: jest.fn() },
    onboardingCustomFieldValue: { upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe("POST /api/v1/employee-onboarding/documents/:documentId/submit", () => {
  beforeEach(() => {
    resetEmployeeOnboardingMocks();
  });

  it("creates a pending document submission", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());
    onboardingDocumentSubmissionFindFirstMock.mockResolvedValue(null);
    onboardingDocumentSubmissionCreateMock.mockResolvedValue(
      buildSubmissionRecord(),
    );

    const response = await request(app)
      .post(`/api/v1/employee-onboarding/documents/${DOCUMENT_ID}/submit`)
      .send(buildSubmitDocumentBody())
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Document submitted successfully",
      data: {
        documentId: DOCUMENT_ID,
        documentName: "NBI Clearance",
        status: "pending",
      },
    });
  });

  it("allows re-upload when the previous submission was rejected", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());
    onboardingDocumentSubmissionFindFirstMock.mockResolvedValue(
      buildSubmissionRecord({
        status: "REJECTED",
        rejectionNote: "The scan is blurry. Please upload a clearer copy.",
      }),
    );
    onboardingDocumentSubmissionCreateMock.mockResolvedValue(
      buildSubmissionRecord({ id: "new-submission-id" }),
    );

    const response = await request(app)
      .post(`/api/v1/employee-onboarding/documents/${DOCUMENT_ID}/submit`)
      .send(buildSubmitDocumentBody())
      .expect(201);

    expect(response.body.data.status).toBe("pending");
    expect(onboardingDocumentSubmissionCreateMock).toHaveBeenCalled();
  });

  it("returns 409 when a pending submission already exists", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());
    onboardingDocumentSubmissionFindFirstMock.mockResolvedValue(
      buildSubmissionRecord({ status: "PENDING" }),
    );

    const response = await request(app)
      .post(`/api/v1/employee-onboarding/documents/${DOCUMENT_ID}/submit`)
      .send(buildSubmitDocumentBody())
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "DOCUMENT_SUBMISSION_NOT_ALLOWED",
    });
  });

  it("returns 400 for an invalid file type", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());
    onboardingDocumentSubmissionFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/employee-onboarding/documents/${DOCUMENT_ID}/submit`)
      .send({
        fileUrl: "https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.exe",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVALID_FILE_TYPE",
    });
  });
});
