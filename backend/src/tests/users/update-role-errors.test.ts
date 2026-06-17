import request from "supertest";
import { app } from "../../app";
import {
  ADMIN_USER_ID,
  buildAdminUser,
  buildUserRecord,
  countMock,
  findUniqueMock,
  resetUserMocks,
  TARGET_USER_ID,
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

describe("PATCH /api/v1/users/:userId/role - errors", () => {
  beforeEach(() => {
    resetUserMocks();
  });

  it("returns 400 for an invalid role", async () => {
    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/role`)
      .send({ role: "ADMIN" })
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

  it("returns 404 when the user does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/role`)
      .send({ role: "HR" })
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

  it("returns 409 when the user is already deactivated", async () => {
    findUniqueMock.mockResolvedValue(buildUserRecord({ id: TARGET_USER_ID, isActive: false }));

    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/role`)
      .send({ role: "HR" })
      .expect(409);

    expect(response.body).toEqual({
      success: false,
      message: "User is already deactivated",
      errorCode: "USER_ALREADY_DEACTIVATED",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 403 when an admin tries to change their own role", async () => {
    const response = await request(app)
      .patch(`/api/v1/users/${ADMIN_USER_ID}/role`)
      .send({ role: "HR" })
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You cannot change your own role",
      errorCode: "CANNOT_CHANGE_OWN_ROLE",
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 422 when demoting the last remaining admin", async () => {
    findUniqueMock.mockResolvedValue(buildUserRecord({ id: TARGET_USER_ID, role: "ADMIN" }));
    countMock.mockResolvedValue(1);

    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/role`)
      .send({ role: "HR" })
      .expect(422);

    expect(response.body).toEqual({
      success: false,
      message:
        "Cannot change the role of the last remaining admin. The system must always have at least one admin.",
      errorCode: "CANNOT_DEMOTE_LAST_ADMIN",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
