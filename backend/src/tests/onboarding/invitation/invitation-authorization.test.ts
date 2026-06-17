import request from "supertest";
import { app } from "../../../app";
import {
  INVITATION_ID,
  RECORD_ID,
  buildEmployeeUser,
  resetInvitationMocks,
} from "./invitation-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildEmployeeUser();
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

describe("Invitations - authorization", () => {
  beforeEach(() => {
    resetInvitationMocks();
  });

  it("returns 403 when a regular employee tries to send an invitation", async () => {
    const response = await request(app)
      .post(`/api/v1/onboarding/invitations/${RECORD_ID}/send`)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 when a regular employee tries to view invitation status", async () => {
    const response = await request(app)
      .get(`/api/v1/onboarding/invitations/${RECORD_ID}`)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 when a regular employee tries to resend an invitation", async () => {
    const response = await request(app)
      .post(`/api/v1/onboarding/invitations/${INVITATION_ID}/resend`)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });
});
