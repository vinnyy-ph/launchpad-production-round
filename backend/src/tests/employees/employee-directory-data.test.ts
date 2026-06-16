import request from "supertest";
import { app } from "../../app";
import { buildEmployeeRecord, countMock, findManyMock, resetEmployeeMocks } from "./employees-test.helpers";

// Avoid loading Firebase Admin while testing the employee route through the Express app.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Replace Prisma with a controllable in-memory mock for this endpoint scenario.
jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    employee: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe("GET /api/v1/employees - employee directory data", () => {
  beforeEach(() => {
    resetEmployeeMocks();
  });

  it("returns employee status, team data, and supervisor data", async () => {
    // This fixture includes the relations the directory UI needs to render each row.
    findManyMock.mockResolvedValue([
      buildEmployeeRecord({
        id: "employee-active",
        firstName: "Marcus",
        lastName: "Reed",
        status: "ACTIVE",
        teamName: "Engineering",
        supervisor: {
          id: "supervisor-1",
          firstName: "Avery",
          lastName: "Cole",
          companyEmail: "avery.cole@example.com",
          jobTitle: "Engineering Manager",
        },
      }),
    ]);
    countMock.mockResolvedValue(1);

    const response = await request(app).get("/api/v1/employees").expect(200);

    // Verify the API maps Prisma relation data into the public response DTO shape.
    expect(response.body.data[0]).toMatchObject({
      id: "employee-active",
      fullName: "Marcus Reed",
      status: "active",
      teams: [{ id: "team-engineering", name: "Engineering" }],
      supervisor: {
        id: "supervisor-1",
        fullName: "Avery Cole",
        companyEmail: "avery.cole@example.com",
        jobTitle: "Engineering Manager",
      },
    });
  });
});
