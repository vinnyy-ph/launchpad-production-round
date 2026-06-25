import request from "supertest";
import { app } from "../../../app";
import {
  INVITATION_ID,
  buildHrUser,
  buildInvitationWithRecord,
  mockSuccessfulInvitationUpdate,
  onboardingInvitationFindFirstMock,
  onboardingInvitationResendAttemptCountMock,
  onboardingInvitationResendAttemptCreateMock,
  onboardingInvitationUpdateMock,
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

describe("POST /api/v1/onboarding/invitations/:invitationId/resend", () => {
  beforeEach(() => {
    resetInvitationMocks();
  });

  it("resends an invitation and returns 200", async () => {
    onboardingInvitationFindFirstMock.mockResolvedValue(
      buildInvitationWithRecord(),
    );
    mockSuccessfulInvitationUpdate();

    const response = await request(app)
      .post(`/api/v1/onboarding/invitations/${INVITATION_ID}/resend`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Invitation resent successfully",
      data: {
        id: INVITATION_ID,
        sentToEmail: "maria.santos@launchpad.ph",
        status: "pending",
      },
    });

    expect(onboardingInvitationUpdateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: INVITATION_ID },
        data: expect.objectContaining({
          status: "PENDING",
          sentAt: expect.any(Date),
          expiresAt: expect.any(Date),
        }),
      }),
    );

    const resentData = onboardingInvitationUpdateMock.mock.calls[0][0].data;
    expect(
      Math.abs(
        resentData.expiresAt.getTime() -
          resentData.sentAt.getTime() -
          24 * 60 * 60 * 1000,
      ),
    ).toBeLessThan(1000);
    expect(onboardingInvitationResendAttemptCreateMock).toHaveBeenCalledWith({
      data: { invitationId: INVITATION_ID },
    });
  });

  it("returns 429 when resending before the 60-second cooldown", async () => {
    onboardingInvitationFindFirstMock.mockResolvedValue(
      buildInvitationWithRecord({ sentAt: new Date() }),
    );

    const response = await request(app)
      .post(`/api/v1/onboarding/invitations/${INVITATION_ID}/resend`)
      .expect(429);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVITATION_RESEND_COOLDOWN",
    });
    expect(onboardingInvitationUpdateMock).not.toHaveBeenCalled();
    expect(onboardingInvitationResendAttemptCreateMock).not.toHaveBeenCalled();
  });

  it("allows resend at or after the 60-second cooldown", async () => {
    onboardingInvitationFindFirstMock.mockResolvedValue(
      buildInvitationWithRecord({
        sentAt: new Date(Date.now() - 60_000),
      }),
    );
    mockSuccessfulInvitationUpdate();

    await request(app)
      .post(`/api/v1/onboarding/invitations/${INVITATION_ID}/resend`)
      .expect(200);

    expect(onboardingInvitationResendAttemptCreateMock).toHaveBeenCalledWith({
      data: { invitationId: INVITATION_ID },
    });
  });

  it("returns 429 after 5 resend attempts in the rolling hour", async () => {
    onboardingInvitationFindFirstMock.mockResolvedValue(
      buildInvitationWithRecord(),
    );
    onboardingInvitationResendAttemptCountMock.mockResolvedValue(5);

    const response = await request(app)
      .post(`/api/v1/onboarding/invitations/${INVITATION_ID}/resend`)
      .expect(429);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVITATION_RESEND_RATE_LIMITED",
    });
    expect(onboardingInvitationUpdateMock).not.toHaveBeenCalled();
    expect(onboardingInvitationResendAttemptCreateMock).not.toHaveBeenCalled();
  });

  it("allows resend when fewer than 5 attempts are in the rolling hour", async () => {
    onboardingInvitationFindFirstMock.mockResolvedValue(
      buildInvitationWithRecord(),
    );
    onboardingInvitationResendAttemptCountMock.mockResolvedValue(4);
    mockSuccessfulInvitationUpdate();

    await request(app)
      .post(`/api/v1/onboarding/invitations/${INVITATION_ID}/resend`)
      .expect(200);

    expect(onboardingInvitationResendAttemptCountMock).toHaveBeenCalledWith({
      where: {
        invitationId: INVITATION_ID,
        attemptedAt: {
          gte: expect.any(Date),
        },
      },
    });
    expect(onboardingInvitationResendAttemptCreateMock).toHaveBeenCalledWith({
      data: { invitationId: INVITATION_ID },
    });
  });

  it("returns 404 when the invitation does not exist", async () => {
    onboardingInvitationFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/v1/onboarding/invitations/${INVITATION_ID}/resend`)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVITATION_NOT_FOUND",
    });
  });

  it("returns 409 when the invitation was already accepted", async () => {
    onboardingInvitationFindFirstMock.mockResolvedValue(
      buildInvitationWithRecord({ status: "ACCEPTED" }),
    );

    const response = await request(app)
      .post(`/api/v1/onboarding/invitations/${INVITATION_ID}/resend`)
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVITATION_ALREADY_ACCEPTED",
    });
  });
});
