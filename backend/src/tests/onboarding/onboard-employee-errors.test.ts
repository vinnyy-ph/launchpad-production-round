import request from "supertest";
import { app } from "../../app";
import {
  buildEmployeeUser,
  buildHrUser,
  buildOnboardBody,
  employeeFindFirstMock,
  resetOnboardingMocks,
  transactionMock,
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

describe("POST /api/v1/onboarding - error cases", () => {
  beforeEach(() => {
    resetOnboardingMocks();
  });

  it("returns 409 when an employee with the email already exists", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "existing-user-id" });

    const response = await request(app)
      .post("/api/v1/onboarding")
      .send(buildOnboardBody())
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "An employee with this email already exists",
      errorCode: "EMPLOYEE_ALREADY_EXISTS",
      errors: [
        {
          field: "companyEmail",
          message: "An employee with this email already exists",
          code: "EMPLOYEE_ALREADY_EXISTS",
        },
      ],
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the supervisor does not exist", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    employeeFindFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/onboarding")
      .send(buildOnboardBody())
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "Supervisor not found",
      errorCode: "SUPERVISOR_NOT_FOUND",
      errors: [
        {
          field: "supervisorId",
          message: "Supervisor not found",
          code: "SUPERVISOR_NOT_FOUND",
        },
      ],
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
