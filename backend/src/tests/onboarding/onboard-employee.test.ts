import request from "supertest";
import { app } from "../../app";
import {
  buildHrUser,
  buildOnboardBody,
  buildSupervisorRecord,
  employeeFindFirstMock,
  mockOnboardingTransaction,
  resetOnboardingMocks,
  userFindUniqueMock,
} from "./onboarding-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
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

describe("POST /api/v1/onboarding - onboard employee", () => {
  beforeEach(() => {
    resetOnboardingMocks();
  });

  it("creates a new employee and returns 201 with onboarding data", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    employeeFindFirstMock.mockResolvedValue(buildSupervisorRecord());
    mockOnboardingTransaction();

    const response = await request(app)
      .post("/api/v1/onboarding")
      .send(buildOnboardBody())
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Employee onboarded successfully",
      data: {
        employee: {
          id: "new-employee-id",
          companyEmail: "new.hire@example.com",
          jobTitle: "Software Engineer",
          department: "Engineering",
          status: "onboarding",
          supervisor: {
            id: expect.any(String),
            firstName: "Jane",
            lastName: "Manager",
          },
        },
        onboardingRecord: {
          id: "record-id",
          isComplete: false,
        },
        invitation: {
          id: "invitation-id",
          sentToEmail: "new.hire@example.com",
          status: "pending",
        },
      },
    });
  });

  it("normalizes the email to lowercase", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    employeeFindFirstMock.mockResolvedValue(buildSupervisorRecord());
    mockOnboardingTransaction();

    await request(app)
      .post("/api/v1/onboarding")
      .send(buildOnboardBody())
      .expect(201);

    expect(userFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "new.hire@example.com" },
      }),
    );
  });
});
