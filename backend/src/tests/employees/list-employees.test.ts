import request from "supertest";
import { app } from "../../app";
import { buildEmployeeRecord, countMock, findManyMock, resetEmployeeMocks } from "./employees-test.helpers";

// The employee endpoint is temporarily unauthenticated, but app.ts still imports auth for /me.
// Mocking auth prevents Firebase Admin dependencies from loading in this endpoint test suite.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock only the Prisma methods used by the employee directory query.
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

describe("GET /api/v1/employees - view all employees", () => {
  beforeEach(() => {
    resetEmployeeMocks();
  });

  it("returns all employees with pagination metadata and supported status values", async () => {
    // Seed each lifecycle status to verify the API returns the full directory range.
    findManyMock.mockResolvedValue([
      buildEmployeeRecord({
        id: "employee-onboarding",
        firstName: "Olivia",
        lastName: "Santos",
        status: "ONBOARDING",
        teamName: "People",
      }),
      buildEmployeeRecord({
        id: "employee-active",
        firstName: "Marcus",
        lastName: "Reed",
        status: "ACTIVE",
        teamName: "Engineering",
      }),
      buildEmployeeRecord({
        id: "employee-offboarding",
        firstName: "Nina",
        lastName: "Park",
        status: "OFFBOARDING",
        teamName: "Operations",
      }),
      buildEmployeeRecord({
        id: "employee-inactive",
        firstName: "Theo",
        lastName: "Grant",
        status: "INACTIVE",
        teamName: "Finance",
      }),
    ]);
    countMock.mockResolvedValue(4);

    const response = await request(app).get("/api/v1/employees").expect(200);

    // The response should use the shared paginated success envelope.
    expect(response.body).toMatchObject({
      success: true,
      meta: {
        page: 1,
        limit: 25,
        total: 4,
        totalPages: 1,
      },
    });
    // Prisma enum values are uppercase internally; API consumers receive lowercase status values.
    expect(response.body.data).toHaveLength(4);
    expect(response.body.data.map((employee: { status: string }) => employee.status)).toEqual([
      "onboarding",
      "active",
      "offboarding",
      "inactive",
    ]);
  });
});
