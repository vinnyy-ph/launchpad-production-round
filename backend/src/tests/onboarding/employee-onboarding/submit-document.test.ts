import request from "supertest";
import { app } from "../../../app";
import {
  DOCUMENT_ID,
  attachSubmitDocumentFile,
  buildDocumentRecord,
  buildEmployeeUser,
  buildOnboardingRecord,
  buildSubmissionRecord,
  onboardingDocumentFindFirstMock,
  onboardingDocumentSubmissionCreateMock,
  onboardingDocumentSubmissionFindFirstMock,
  onboardingRecordFindFirstMock,
  resetEmployeeOnboardingMocks,
} from "./employee-onboarding-test.helpers";

const uploadOnboardingDocumentMock = jest.fn();

jest.mock("../../../core/cloudinary", () => ({
  CloudinaryService: jest.fn().mockImplementation(() => ({
    uploadOnboardingDocument: (...args: unknown[]) =>
      uploadOnboardingDocumentMock(...args),
  })),
}));

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
    uploadOnboardingDocumentMock.mockReset();
    uploadOnboardingDocumentMock.mockResolvedValue(
      "https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.pdf",
    );
  });

  it("creates a pending document submission", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());
    onboardingDocumentSubmissionFindFirstMock.mockResolvedValue(null);
    onboardingDocumentSubmissionCreateMock.mockResolvedValue(
      buildSubmissionRecord(),
    );

    const response = await attachSubmitDocumentFile(
      request(app).post(
        `/api/v1/employee-onboarding/documents/${DOCUMENT_ID}/submit`,
      ),
    ).expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Document submitted successfully",
      data: {
        documentId: DOCUMENT_ID,
        documentName: "NBI Clearance",
        status: "pending",
      },
    });
    expect(uploadOnboardingDocumentMock).toHaveBeenCalled();
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

    const response = await attachSubmitDocumentFile(
      request(app).post(
        `/api/v1/employee-onboarding/documents/${DOCUMENT_ID}/submit`,
      ),
    ).expect(201);

    expect(response.body.data.status).toBe("pending");
    expect(onboardingDocumentSubmissionCreateMock).toHaveBeenCalled();
  });

  it("returns 409 when a pending submission already exists", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());
    onboardingDocumentSubmissionFindFirstMock.mockResolvedValue(
      buildSubmissionRecord({ status: "PENDING" }),
    );

    const response = await attachSubmitDocumentFile(
      request(app).post(
        `/api/v1/employee-onboarding/documents/${DOCUMENT_ID}/submit`,
      ),
    ).expect(409);

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
      .attach("file", Buffer.from("fake executable"), "nbi-clearance.exe")
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVALID_FILE_TYPE",
    });
    expect(uploadOnboardingDocumentMock).not.toHaveBeenCalled();
  });

  it("returns 400 when a PDF extension hides non-PDF content", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingDocumentFindFirstMock.mockResolvedValue(buildDocumentRecord());
    onboardingDocumentSubmissionFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/employee-onboarding/documents/${DOCUMENT_ID}/submit`)
      .attach("file", Buffer.from("MZ fake executable"), "nbi-clearance.pdf", {
        contentType: "application/pdf",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVALID_FILE_TYPE",
    });
    expect(uploadOnboardingDocumentMock).not.toHaveBeenCalled();
  });
});
