import request from "supertest";
import { app } from "../../app";
import { buildViewer, countMock, findManyMock, resetEmployeeMocks } from "./employees-test.helpers";

// Authenticate as HR so the request reaches the validation path under test.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildViewer({ role: "HR" });
    next();
  },
}));

// Prisma should never be called when validation fails before repository access.
jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    activityLog: { createMany: jest.fn() },
  },
}));

describe("GET /api/v1/employees - invalid status filter", () => {
  beforeEach(() => {
    resetEmployeeMocks();
  });

  it("returns a shared API error response for invalid status filters", async () => {
    // `archived` is not part of the public employee status filter contract.
    const response = await request(app)
      .get("/api/v1/employees")
      .query({ status: "archived" })
      .expect(400);

    // Validation errors should use the shared API error response envelope.
    expect(response.body).toEqual({
      success: false,
      message: "Invalid employee status",
      errorCode: "INVALID_EMPLOYEE_STATUS",
      errors: [
        {
          field: "status",
          message: "Allowed values: onboarding, active, offboarding, inactive",
          code: "INVALID_ENUM_VALUE",
        },
      ],
    });
    // The controller should stop before database access when query validation fails.
    expect(findManyMock).not.toHaveBeenCalled();
    expect(countMock).not.toHaveBeenCalled();
  });
});
