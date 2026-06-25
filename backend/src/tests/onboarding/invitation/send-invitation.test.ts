import request from "supertest";
import { app } from "../../../app";
import {
  RECORD_ID,
  buildHrUser,
  buildInvitationRecord,
  buildOnboardingRecord,
  mockSuccessfulInvitationUpdate,
  onboardingInvitationCreateMock,
  onboardingInvitationResendAttemptCountMock,
  onboardingInvitationResendAttemptCreateMock,
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

describe("POST /api/v1/onboarding/invitations/:recordId/send", () => {
  beforeEach(() => {
    resetInvitationMocks();
  });

  it("sends an invitation and returns 201", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({
        invitations: [buildInvitationRecord({ sentAt: new Date() })],
      }),
    );
    mockSuccessfulInvitationUpdate();

    const response = await request(app)
      .post(`/api/v1/onboarding/invitations/${RECORD_ID}/send`)
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Invitation sent successfully",
      data: {
        id: expect.any(String),
        recordId: RECORD_ID,
        sentToEmail: "maria.santos@launchpad.ph",
        status: "pending",
      },
    });
    expect(onboardingInvitationResendAttemptCountMock).not.toHaveBeenCalled();
    expect(onboardingInvitationResendAttemptCreateMock).not.toHaveBeenCalled();
  });

  it("creates an invitation when none exists yet", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(
      buildOnboardingRecord({ invitations: [] }),
    );
    onboardingInvitationCreateMock.mockResolvedValue(buildInvitationRecord());
    mockSuccessfulInvitationUpdate();

    await request(app)
      .post(`/api/v1/onboarding/invitations/${RECORD_ID}/send`)
      .expect(201);

    expect(onboardingInvitationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recordId: RECORD_ID,
          sentToEmail: "maria.santos@launchpad.ph",
          expiresAt: expect.any(Date),
        }),
      }),
    );

    const createData = onboardingInvitationCreateMock.mock.calls[0][0].data;
    expect(
      Math.abs(createData.expiresAt.getTime() - Date.now() - 24 * 60 * 60 * 1000),
    ).toBeLessThan(1000);
  });

  it("returns 404 when the onboarding record does not exist", async () => {
    onboardingRecordFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/onboarding/invitations/${RECORD_ID}/send`)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ONBOARDING_RECORD_NOT_FOUND",
    });
  });
});
