import request from "supertest";
import { app } from "../../app";
import {
  TARGET_USER_ID,
  buildAdminUser,
  buildUserRecord,
  findUniqueMock,
  resetUserMocks,
  updateMock,
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

describe("PATCH /api/v1/users/:userId/activate - errors", () => {
  beforeEach(() => {
    resetUserMocks();
  });

  it("returns 404 when the user does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/activate`)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      message: "User not found",
      errorCode: "USER_NOT_FOUND",
      errors: [
        {
          field: "userId",
          message: "User not found",
          code: "USER_NOT_FOUND",
        },
      ],
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the user is already active", async () => {
    findUniqueMock.mockResolvedValue(buildUserRecord({ id: TARGET_USER_ID, isActive: true }));

    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/activate`)
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "User is already active",
      errorCode: "USER_ALREADY_ACTIVE",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
