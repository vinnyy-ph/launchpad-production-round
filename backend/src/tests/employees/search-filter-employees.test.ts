import request from "supertest";
import { app } from "../../app";
import { buildViewer, countMock, findManyMock, resetEmployeeMocks } from "./employees-test.helpers";

// Authenticate as HR so the request reaches the repository query under test.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildViewer({ role: "HR" });
    next();
  },
}));

// Mock Prisma so the test can assert generated query behavior directly.
jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("GET /api/v1/employees - search and filter employees", () => {
  beforeEach(() => {
    resetEmployeeMocks();
  });

  it("passes search and filter query parameters to the repository query", async () => {
    // Empty results are enough here because this scenario verifies query construction.
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    await request(app)
      .get("/api/v1/employees")
      .query({
        search: "marcus",
        status: "active",
        team: "engineering",
        supervisorId: "supervisor-1",
        sortBy: "department",
        sortDirection: "desc",
        page: "2",
        limit: "10",
      })
      .expect(200);

    // The repository should combine search, status, team, supervisor, and pagination filters.
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [
          { department: { name: "desc" } },
          { lastName: "asc" },
          { firstName: "asc" },
        ],
        where: expect.objectContaining({
          status: "ACTIVE",
          supervisorId: "supervisor-1",
          OR: expect.arrayContaining([
            { firstName: { contains: "marcus", mode: "insensitive" } },
            { companyEmail: { contains: "marcus", mode: "insensitive" } },
            { department: { name: { contains: "marcus", mode: "insensitive" } } },
          ]),
          teamMemberships: {
            some: {
              team: {
                name: { contains: "engineering", mode: "insensitive" },
              },
            },
          },
        }),
      }),
    );
    expect(countMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: "ACTIVE",
        supervisorId: "supervisor-1",
      }),
    });
  });
});
