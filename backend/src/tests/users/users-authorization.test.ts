import request from "supertest";
import { app } from "../../app";
import { buildHrUser, resetUserMocks, TARGET_USER_ID } from "./users-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
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

describe("User management authorization", () => {
  beforeEach(() => {
    resetUserMocks();
  });

  it("returns 403 for non-admin callers on GET /api/v1/users", async () => {
    const response = await request(app).get("/api/v1/users").expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 for non-admin callers on POST /api/v1/users", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .send({
        email: "new.hire@example.com",
        role: "HR",
        firstName: "New",
        lastName: "Hire",
      })
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 for non-admin callers on PATCH /api/v1/users/:userId/deactivate", async () => {
    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/deactivate`)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 for non-admin callers on PATCH /api/v1/users/:userId/activate", async () => {
    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/activate`)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });

  it("returns 403 for non-admin callers on PATCH /api/v1/users/:userId/role", async () => {
    const response = await request(app)
      .patch(`/api/v1/users/${TARGET_USER_ID}/role`)
      .send({ role: "HR" })
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action",
    });
  });
});
