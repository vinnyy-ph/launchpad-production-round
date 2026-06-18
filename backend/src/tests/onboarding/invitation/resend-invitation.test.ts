import request from "supertest";
import { app } from "../../../app";
import {
  INVITATION_ID,
  buildHrUser,
  buildInvitationWithRecord,
  mockSuccessfulInvitationUpdate,
  onboardingInvitationFindFirstMock,
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
