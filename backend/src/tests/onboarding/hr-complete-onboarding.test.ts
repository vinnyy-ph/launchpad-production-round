import request from "supertest";
import { app } from "../../app";
import { EmailService } from "../../core/email";
import {
  buildHrUser,
  buildOnboardingRecord,
  EMPLOYEE_ID,
  employeeUpdateMock,
  onboardingRecordFindFirstMock,
  onboardingRecordUpdateMock,
  resetHrCompleteOnboardingMocks,
} from "./hr-complete-onboarding-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    onboardingRecord: { findFirst: jest.fn(), update: jest.fn() },
    employee: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// All EmailService instances share one sendEmail mock (factory closure) so we can
// assert on it regardless of which instance sent the mail.
jest.mock("../../core/email", () => {
  const sendEmail = jest.fn();
  return { EmailService: jest.fn(() => ({ sendEmail })) };
});

const mockSendEmail = (
  new (EmailService as unknown as jest.Mock)() as { sendEmail: jest.Mock }
).sendEmail;

describe("POST /api/v1/onboarding/:employeeId/complete - HR complete onboarding", () => {
  beforeEach(() => {
    resetHrCompleteOnboardingMocks();
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("marks onboarding complete when all requirements are satisfied", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingRecordUpdateMock.mockResolvedValue({
      id: "770e8400-e29b-41d4-a716-446655440002",
      isComplete: true,
      completedAt: new Date("2026-06-18T04:30:00.000Z"),
    });
    employeeUpdateMock.mockResolvedValue({
      id: EMPLOYEE_ID,
      status: "ACTIVE",
    });

    const response = await request(app)
      .post(`/api/v1/onboarding/${EMPLOYEE_ID}/complete`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Employee onboarding completed successfully",
      data: {
        recordId: "770e8400-e29b-41d4-a716-446655440002",
        isComplete: true,
        employeeStatus: "active",
      },
    });
    expect(onboardingRecordFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { employeeId: EMPLOYEE_ID },
      }),
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maria.santos@launchpad.ph",
        subject: "Your Manage Jia account is active",
      }),
    );
  });

  it("still completes onboarding when the activation email fails to send", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingRecordUpdateMock.mockResolvedValue({
      id: "770e8400-e29b-41d4-a716-446655440002",
      isComplete: true,
      completedAt: new Date("2026-06-18T04:30:00.000Z"),
    });
    employeeUpdateMock.mockResolvedValue({ id: EMPLOYEE_ID, status: "ACTIVE" });
    mockSendEmail.mockRejectedValueOnce(new Error("SMTP unavailable"));

    const response = await request(app)
      .post(`/api/v1/onboarding/${EMPLOYEE_ID}/complete`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: { isComplete: true, employeeStatus: "active" },
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when no onboarding record exists for the employee", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/onboarding/${EMPLOYEE_ID}/complete`)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_RECORD_NOT_FOUND",
    });
  });

  it("returns 409 when onboarding is already complete", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({
        isComplete: true,
        completedAt: new Date("2026-06-17T12:00:00.000Z"),
      }),
    );

    const response = await request(app)
      .post(`/api/v1/onboarding/${EMPLOYEE_ID}/complete`)
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_ALREADY_COMPLETE",
    });
  });

  it("returns 422 when required documents are not approved", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({
        documentSubmissions: [],
      }),
    );

    const response = await request(app)
      .post(`/api/v1/onboarding/${EMPLOYEE_ID}/complete`)
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_NOT_READY",
    });
  });

  it("returns 422 when documents are pending but not approved", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({
        documentSubmissions: [
          {
            id: "submission-id",
            recordId: "770e8400-e29b-41d4-a716-446655440002",
            documentId: "document-id",
            fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1710000000/onboarding/maria-santos/nbi-clearance.pdf",
            status: "PENDING",
            rejectionNote: null,
            reviewerId: null,
            submittedAt: new Date("2026-06-17T10:00:00.000Z"),
            reviewedAt: null,
          },
        ],
      }),
    );

    const response = await request(app)
      .post(`/api/v1/onboarding/${EMPLOYEE_ID}/complete`)
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_NOT_READY",
    });
  });

  it("returns 422 when required profile fields are missing", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({
        employee: {
          address: null,
        },
      }),
    );

    const response = await request(app)
      .post(`/api/v1/onboarding/${EMPLOYEE_ID}/complete`)
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_NOT_READY",
    });
  });
});
