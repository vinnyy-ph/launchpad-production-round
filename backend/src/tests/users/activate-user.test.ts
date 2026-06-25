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

describe("PATCH /api/v1/users/:userId/activate - success", () => {
  beforeEach(() => {
    resetUserMocks();
  });

  it("activates a deactivated HR user and returns the updated account", async () => {
    const activatedUser = buildUserRecord({ id: TARGET_USER_ID, role: "HR", isActive: true });

    findUniqueMock.mockResolvedValue(buildUserRecord({ id: TARGET_USER_ID, role: "HR", isActive: false }));
    updateMock.mockResolvedValue(activatedUser);

    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/activate`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "User activated successfully",
      data: {
        id: TARGET_USER_ID,
        isActive: true,
        role: "HR",
      },
    });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TARGET_USER_ID },
        data: { isActive: true },
      }),
    );
  });
});
