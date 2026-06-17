import request from "supertest";
import { app } from "../../app";
import { buildAdminUser, countMock, findManyMock, resetUserMocks } from "./users-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildAdminUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    employee: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe("GET /api/v1/users - validation", () => {
  beforeEach(() => {
    resetUserMocks();
  });

  it("returns a shared API error response for invalid role filters", async () => {
    const response = await request(app)
      .get("/api/v1/users")
      .query({ role: "SUPERADMIN" })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
      errors: [
        {
          field: "user role",
          message: "Invalid user role",
          code: "VALIDATION_FAILED",
        },
      ],
    });
    expect(findManyMock).not.toHaveBeenCalled();
    expect(countMock).not.toHaveBeenCalled();
  });
});
