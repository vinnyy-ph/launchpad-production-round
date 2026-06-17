import request from "supertest";
import { app } from "../../app";
import {
  buildAdminUser,
  buildUserRecord,
  findUniqueMock,
  mockCreateUserTransaction,
  resetUserMocks,
  TARGET_USER_ID,
} from "./users-test.helpers";

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

describe("POST /api/v1/users - add user", () => {
  beforeEach(() => {
    resetUserMocks();
  });

  it("creates a new HR user and returns 201 with normalized email", async () => {
    const createdUser = buildUserRecord({
      id: TARGET_USER_ID,
      email: "new.hire@example.com",
      role: "HR",
      firstName: "New",
      lastName: "Hire",
    });

    findUniqueMock.mockResolvedValue(null);
    mockCreateUserTransaction(createdUser);

    const response = await request(app)
      .post("/api/v1/users")
      .send({
        email: "New.Hire@Example.com",
        role: "HR",
        firstName: "New",
        lastName: "Hire",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "User created successfully",
      data: {
        id: TARGET_USER_ID,
        email: "new.hire@example.com",
        role: "HR",
        isActive: true,
        firstName: "New",
        lastName: "Hire",
        fullName: "New Hire",
        employeeStatus: "onboarding",
      },
    });
  });
});
