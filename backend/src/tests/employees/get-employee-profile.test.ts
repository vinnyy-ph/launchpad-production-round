import request from "supertest";
import { app } from "../../app";
import {
  buildEmployeeProfileRecord,
  findFirstMock,
  resetEmployeeMocks,
} from "./employees-test.helpers";

// Mock auth because this endpoint is temporarily unauthenticated while API behavior is tested.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock Prisma so this profile test controls the exact HR-visible employee record.
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

describe("GET /api/v1/employees/:employeeId - HR employee profile", () => {
  beforeEach(() => {
    resetEmployeeMocks();
  });

  it("returns an unredacted employee profile for HR", async () => {
    findFirstMock.mockResolvedValue(buildEmployeeProfileRecord());

    const response = await request(app).get("/api/v1/employees/employee-active").expect(200);

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "employee-active",
        },
      }),
    );
    // HR can view personal and account fields, so the profile response should not redact them.
    expect(response.body).toMatchObject({
      success: true,
      message: "Employee retrieved successfully",
      data: {
        id: "employee-active",
        userId: "employee-active-user",
        user: {
          id: "employee-active-user",
          email: "marcus.reed@example.com",
          role: "EMPLOYEE",
          isActive: true,
        },
        companyEmail: "marcus.reed@example.com",
        personalEmail: "marcus.personal@example.com",
        birthday: "1992-04-12T00:00:00.000Z",
        address: "123 Example Street",
        emergencyContact: "Jamie Reed, +1 555 0100",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        status: "active",
        teams: [{ id: "team-engineering", name: "Engineering" }],
        ledTeams: [{ id: "team-platform", name: "Platform" }],
        supervisor: {
          id: "supervisor-1",
          fullName: "Avery Cole",
        },
        directReports: [
          {
            id: "direct-report-1",
            fullName: "Taylor Ng",
            status: "active",
          },
        ],
      },
    });
  });

  it("allows HR to view non-active employee profiles without redacting personal data", async () => {
    findFirstMock.mockResolvedValue({
      ...buildEmployeeProfileRecord(),
      id: "employee-inactive",
      status: "INACTIVE",
      personalEmail: "inactive.personal@example.com",
      address: "999 Former Employee Road",
      emergencyContact: "Casey Contact, +1 555 0999",
      user: {
        id: "employee-inactive-user",
        email: "inactive.employee@example.com",
        role: "EMPLOYEE",
        isActive: false,
      },
    });

    const response = await request(app).get("/api/v1/employees/employee-inactive").expect(200);

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "employee-inactive",
        },
      }),
    );
    // "Any employee profile" includes inactive employees, and HR receives the same unredacted fields.
    expect(response.body.data).toMatchObject({
      id: "employee-inactive",
      status: "inactive",
      user: {
        id: "employee-inactive-user",
        email: "inactive.employee@example.com",
        isActive: false,
      },
      personalEmail: "inactive.personal@example.com",
      address: "999 Former Employee Road",
      emergencyContact: "Casey Contact, +1 555 0999",
    });
  });
});
