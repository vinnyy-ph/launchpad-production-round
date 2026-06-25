import request from "supertest";
import { app } from "../../app";
import {
  buildAdminUser,
  buildOnboardBody,
  resetOnboardingMocks,
} from "./onboarding-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildAdminUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    employee: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    employeeEmergencyContact: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  },
}));

describe("POST /api/v1/onboarding - admin authorization", () => {
  beforeEach(() => {
    resetOnboardingMocks();
  });

  it("returns 403 when an admin tries to onboard an employee", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send(buildOnboardBody())
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });
});
