import request from "supertest";
import { app } from "../../../app";
import {
  buildEmployeeUser,
  buildOnboardingRecord,
  buildSubmissionRecord,
  employeeUpdateMock,
  onboardingRecordFindFirstMock,
  onboardingRecordUpdateMock,
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

describe("POST /api/v1/employee-onboarding/complete", () => {
  beforeEach(() => {
    resetEmployeeOnboardingMocks();
  });

  it("marks onboarding complete when all requirements are satisfied", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({
        documentSubmissions: [buildSubmissionRecord({ status: "PENDING" })],
      }),
    );
    onboardingRecordUpdateMock.mockResolvedValue({
      id: "onboarding-record-id",
      isComplete: true,
      completedAt: new Date("2026-06-17T12:00:00.000Z"),
    });
    employeeUpdateMock.mockResolvedValue({
      id: "employee-id",
      status: "ACTIVE",
    });

    const response = await request(app)
      .post("/api/v1/employee-onboarding/complete")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Onboarding completed successfully",
      data: {
        recordId: "onboarding-record-id",
        isComplete: true,
        employeeStatus: "active",
      },
    });
  });

  it("returns 422 when required documents are missing", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({ documentSubmissions: [] }),
    );

    const response = await request(app)
      .post("/api/v1/employee-onboarding/complete")
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_INCOMPLETE",
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
      .post("/api/v1/employee-onboarding/complete")
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_ALREADY_COMPLETE",
    });
  });
});
