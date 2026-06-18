import request from "supertest";
import { app } from "../../../app";
import {
  buildNonSupervisorUser,
  employeeCountMock,
  employeeFindUniqueMock,
  mockNonSupervisorAccess,
  resetSupervisorOnboardingMocks,
} from "./supervisor-onboarding-test.helpers";

jest.mock("../../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildNonSupervisorUser();
    next();
  },
}));

jest.mock("../../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    onboardingRecord: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../../modules/shared/org", () => ({
  downwardChain: jest.fn(),
}));

describe("GET /api/v1/supervisor-onboarding/status authorization", () => {
  beforeEach(() => {
    resetSupervisorOnboardingMocks();
  });

  it("returns 403 when the user is not a supervisor", async () => {
    mockNonSupervisorAccess();

    const response = await request(app)
      .get("/api/v1/supervisor-onboarding/status")
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      message: "You must be a supervisor to access this resource",
      errorCode: "NOT_A_SUPERVISOR",
    });

    expect(employeeCountMock).toHaveBeenCalled();
    expect(employeeFindUniqueMock).toHaveBeenCalled();
  });
});
