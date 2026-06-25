import request from "supertest";
import { app } from "../../../app";
import {
  INVITATION_ID,
  USER_ID,
  buildHrUser,
  buildInvitationWithRecord,
  buildUpdateEmailBody,
  mockSuccessfulInvitationUpdate,
  onboardingInvitationFindFirstMock,
  onboardingInvitationResendAttemptCreateMock,
  resetInvitationMocks,
  transactionMock,
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

describe("PATCH /api/v1/onboarding/invitations/:invitationId/email", () => {
  beforeEach(() => {
    resetInvitationMocks();
    transactionMock.mockResolvedValue([]);
  });

  it("updates the invitation email and returns 200", async () => {
    onboardingInvitationFindFirstMock.mockResolvedValue(
      buildInvitationWithRecord(),
    );
    mockSuccessfulInvitationUpdate({
      sentToEmail: "maria.santos.corrected@launchpad.ph",
    });

    const response = await request(app)
      .patch(`/api/v1/onboarding/invitations/${INVITATION_ID}/email`)
      .send(buildUpdateEmailBody())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Invitation email updated and resent successfully",
      data: {
        sentToEmail: "maria.santos.corrected@launchpad.ph",
        status: "pending",
      },
    });
    expect(onboardingInvitationResendAttemptCreateMock).toHaveBeenCalledWith({
      data: { invitationId: INVITATION_ID },
    });
  });

  it("returns 409 when the employee account was already created", async () => {
    onboardingInvitationFindFirstMock.mockResolvedValue(
      buildInvitationWithRecord({
        record: {
          employee: {
            user: {
              id: USER_ID,
              email: "maria.santos@launchpad.ph",
              googleId: "google-linked-id",
            },
          },
        },
      }),
    );

    const response = await request(app)
      .patch(`/api/v1/onboarding/invitations/${INVITATION_ID}/email`)
      .send(buildUpdateEmailBody())
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "ACCOUNT_ALREADY_CREATED",
    });
  });

  it("returns 400 for an invalid email address", async () => {
    const response = await request(app)
      .patch(`/api/v1/onboarding/invitations/${INVITATION_ID}/email`)
      .send({ email: "not-an-email" })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVALID_EMAIL",
    });
  });

  it("returns 400 for unsafe email content", async () => {
    const response = await request(app)
      .patch(`/api/v1/onboarding/invitations/${INVITATION_ID}/email`)
      .send({ email: "x<script>@test.com" })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
    });
    expect(response.body.errors[0].message).toMatch(/must not contain HTML/);
  });
});
