import request from "supertest";
import { app } from "../../app";
import { buildEmployeeUser, resetOnboardingMocks } from "./onboarding-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildEmployeeUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    employee: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe("POST /api/v1/onboarding - authorization", () => {
  beforeEach(() => {
    resetOnboardingMocks();
  });

  it("returns 403 when a regular employee tries to onboard someone", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        companyEmail: "new.hire@example.com",
        jobTitle: "Engineer",
        supervisorId: "some-id",
        department: "Engineering",
      })
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });
});
