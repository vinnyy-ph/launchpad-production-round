import request from "supertest";
import { app } from "../../app";
import { buildAdminUser, findUniqueMock, resetUserMocks, transactionMock } from "./users-test.helpers";

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

describe("POST /api/v1/users - errors", () => {
  beforeEach(() => {
    resetUserMocks();
  });

  it("returns 400 when email is missing", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .send({
        role: "HR",
        firstName: "Jane",
        lastName: "Doe",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "email",
          message: "email is required",
        }),
      ],
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid email format", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .send({
        email: "not-an-email",
        role: "HR",
        firstName: "Jane",
        lastName: "Doe",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "email",
          message: "Invalid email",
        }),
      ],
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 when role is ADMIN on create", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .send({
        email: "admin.attempt@example.com",
        role: "ADMIN",
        firstName: "Jane",
        lastName: "Doe",
      })
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
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 409 when a user with the email already exists", async () => {
    findUniqueMock.mockResolvedValue({ id: "existing-user-id" });

    const response = await request(app)
      .post("/api/v1/users")
      .send({
        email: "existing@example.com",
        role: "EMPLOYEE",
        firstName: "Jane",
        lastName: "Doe",
      })
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "A user with this email already exists",
      errorCode: "USER_ALREADY_EXISTS",
      errors: [
        {
          field: "email",
          message: "A user with this email already exists",
          code: "USER_ALREADY_EXISTS",
        },
      ],
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
