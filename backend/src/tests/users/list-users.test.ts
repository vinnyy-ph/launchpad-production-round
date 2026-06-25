import request from "supertest";
import { app } from "../../app";
import {
  buildAdminUser,
  buildUserRecord,
  countMock,
  findManyMock,
  resetUserMocks,
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

describe("GET /api/v1/users - list users", () => {
  beforeEach(() => {
    resetUserMocks();
  });

  it("returns a paginated user list with mapped employee fields", async () => {
    findManyMock.mockResolvedValue([
      buildUserRecord({
        id: "user-hr",
        email: "olivia.santos@example.com",
        role: "HR",
        firstName: "Olivia",
        lastName: "Santos",
        employeeStatus: "ONBOARDING",
      }),
      buildUserRecord({
        id: "user-employee",
        email: "marcus.reed@example.com",
        role: "EMPLOYEE",
        firstName: "Marcus",
        lastName: "Reed",
        employeeStatus: "ACTIVE",
      }),
    ]);
    countMock.mockResolvedValue(2);

    const response = await request(app).get("/api/v1/users").expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Users retrieved successfully",
      meta: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    });
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      email: "olivia.santos@example.com",
      role: "HR",
      fullName: "Olivia Santos",
      employeeStatus: "onboarding",
    });
    expect(response.body.data[1]).toMatchObject({
      email: "marcus.reed@example.com",
      role: "EMPLOYEE",
      fullName: "Marcus Reed",
      employeeStatus: "active",
    });
  });

  it("passes role filter to the repository query", async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    await request(app).get("/api/v1/users").query({ role: "HR" }).expect(200);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: "HR" }),
      }),
    );
  });

  it("passes isActive filter to the repository query", async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    await request(app).get("/api/v1/users").query({ isActive: "false" }).expect(200);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: false }),
      }),
    );
  });

  it("includes deactivated users when includeDeactivated is true", async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    await request(app)
      .get("/api/v1/users")
      .query({ includeDeactivated: "true" })
      .expect(200);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });
});
