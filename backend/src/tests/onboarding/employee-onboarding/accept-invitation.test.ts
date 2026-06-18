import request from "supertest";
import { app } from "../../../app";
import {
  buildEmployeeUser,
  buildInvitationRecord,
  buildOnboardingRecord,
  onboardingInvitationFindFirstMock,
  onboardingInvitationUpdateMock,
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

describe("POST /api/v1/employee-onboarding/accept-invitation", () => {
  beforeEach(() => {
    resetEmployeeOnboardingMocks();
  });

  it("accepts a pending invitation and returns onboarding status", async () => {
    const record = buildOnboardingRecord();
    const acceptedRecord = buildOnboardingRecord({
      invitations: [buildInvitationRecord({ status: "ACCEPTED" })],
    });

    onboardingRecordFindFirstMock
      .mockResolvedValueOnce(record)
      .mockResolvedValueOnce(acceptedRecord);
    onboardingInvitationFindFirstMock.mockResolvedValue(buildInvitationRecord());
    onboardingInvitationUpdateMock.mockResolvedValue(
      buildInvitationRecord({ status: "ACCEPTED" }),
    );

    const response = await request(app)
      .post("/api/v1/employee-onboarding/accept-invitation")
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Invitation accepted successfully",
      data: {
        recordId: "onboarding-record-id",
        invitationStatus: "accepted",
        profile: {
          firstName: "Maria",
          lastName: "Santos",
        },
      },
    });

    expect(onboardingInvitationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invitation-id" },
        data: { status: "ACCEPTED" },
      }),
    );
  });

  it("returns 404 when no onboarding record exists", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/employee-onboarding/accept-invitation")
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "EMPLOYEE_ONBOARDING_NOT_FOUND",
    });
  });

  it("returns 409 when the invitation has expired", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingInvitationFindFirstMock.mockResolvedValue(
      buildInvitationRecord({
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      }),
    );

    const response = await request(app)
      .post("/api/v1/employee-onboarding/accept-invitation")
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVITATION_EXPIRED",
    });
  });
});
