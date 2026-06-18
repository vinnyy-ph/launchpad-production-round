import request from "supertest";
import { app } from "../../app";
import { buildViewer, findFirstMock, resetEmployeeMocks } from "./employees-test.helpers";

// Authenticate as HR so the request reaches the profile lookup path under test.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildViewer({ role: "HR" });
    next();
  },
}));

// Prisma returns null when the requested employee does not exist.
jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
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
