import request from "supertest";
import { app } from "../../app";
import {
  buildAdminUser,
  buildUserRecord,
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

describe("PATCH /api/v1/users/:userId/role - success", () => {
  beforeEach(() => {
    resetUserMocks();
  });

  it("updates a user's role and returns the updated account", async () => {
    const updatedUser = buildUserRecord({ id: TARGET_USER_ID, role: "HR" });

    findUniqueMock.mockResolvedValue(buildUserRecord({ id: TARGET_USER_ID, role: "EMPLOYEE" }));
    updateMock.mockResolvedValue(updatedUser);

    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/role`)
      .send({ role: "HR" })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "User role updated successfully",
      data: {
        id: TARGET_USER_ID,
        role: "HR",
      },
    });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TARGET_USER_ID },
        data: { role: "HR" },
      }),
    );
  });
});
