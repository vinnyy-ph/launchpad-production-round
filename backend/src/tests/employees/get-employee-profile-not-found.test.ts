import request from "supertest";
import { app } from "../../app";
import { findFirstMock, resetEmployeeMocks } from "./employees-test.helpers";

// Mock auth because this test targets profile lookup behavior, not authentication.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Prisma returns null when the requested employee does not exist or is soft-deleted.
jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe("GET /api/v1/employees/:employeeId - not found", () => {
  beforeEach(() => {
    resetEmployeeMocks();
  });

  it("returns a shared API error response when the employee does not exist", async () => {
    findFirstMock.mockResolvedValue(null);

    const response = await request(app).get("/api/v1/employees/missing-employee").expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "Employee not found",
      errorCode: "EMPLOYEE_NOT_FOUND",
      errors: [
        {
          field: "employeeId",
          message: "Employee not found",
          code: "EMPLOYEE_NOT_FOUND",
        },
      ],
    });
  });
});
