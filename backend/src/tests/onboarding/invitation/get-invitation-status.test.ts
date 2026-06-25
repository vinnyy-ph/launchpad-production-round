import request from "supertest";
import { app } from "../../../app";
import {
  RECORD_ID,
  buildHrUser,
  buildInvitationRecord,
  buildOnboardingRecord,
  onboardingInvitationFindManyMock,
  onboardingRecordFindFirstMock,
  resetInvitationMocks,
} from "./invitation-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    onboardingRecord: { findFirst: jest.fn() },
    onboardingInvitation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    onboardingInvitationResendAttempt: { count: jest.fn(), create: jest.fn() },
    user: { update: jest.fn() },
    employee: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../../../core/email", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("GET /api/v1/onboarding/invitations/:recordId", () => {
  beforeEach(() => {
    resetInvitationMocks();
  });

  it("returns invitation status for an onboarding record", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingInvitationFindManyMock.mockResolvedValue([
      buildInvitationRecord(),
    ]);

    const response = await request(app)
      .get(`/api/v1/onboarding/invitations/${RECORD_ID}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Invitation status retrieved successfully",
      data: [
        {
          recordId: RECORD_ID,
          sentToEmail: "maria.santos@launchpad.ph",
          status: "pending",
        },
      ],
    });
  });

  it("returns expired status when a pending invitation is past expiry", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(buildOnboardingRecord());
    onboardingInvitationFindManyMock.mockResolvedValue([
      buildInvitationRecord({
        status: "PENDING",
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      }),
    ]);

    const response = await request(app)
      .get(`/api/v1/onboarding/invitations/${RECORD_ID}`)
      .expect(200);

    expect(response.body.data[0].status).toBe("expired");
  });

  it("returns 404 when the onboarding record does not exist", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/v1/onboarding/invitations/${RECORD_ID}`)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_RECORD_NOT_FOUND",
    });
  });
});
