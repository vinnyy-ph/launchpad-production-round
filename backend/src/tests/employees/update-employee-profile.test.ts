import request from "supertest";
import { app } from "../../app";
import {
  buildEmployeeProfileRecord,
  buildViewer,
  findFirstMock,
  resetEmployeeMocks,
  updateMock,
} from "./employees-test.helpers";

// Authenticate as HR so the profile-edit endpoint (HR/Admin-only) is reachable.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildViewer({ role: "HR" });
    next();
  },
}));

// Mock Prisma so this update scenario can assert the generated update payload.
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

describe("PATCH /api/v1/employees/:employeeId - HR employee profile edit", () => {
  beforeEach(() => {
    resetEmployeeMocks();
  });

  it("updates an employee profile and returns the refreshed unredacted profile", async () => {
    const existingProfile = buildEmployeeProfileRecord();
    const updatedProfile = {
      ...existingProfile,
      firstName: "Marco",
      jobTitle: "Senior Backend Engineer",
      status: "ACTIVE",
    };

    findFirstMock.mockResolvedValue(existingProfile);
    updateMock.mockResolvedValue(updatedProfile);

    const response = await request(app)
      .patch("/api/v1/employees/employee-active")
      .send({
        firstName: "Marco",
        jobTitle: "Senior Backend Engineer",
        address: {
          address: "456 Updated Street",
          city: "Makati",
          province: "Metro Manila",
          country: "Philippines",
        },
        emergencyContact: {
          emergencyContactName: "Jules Reed",
          emergencyContactNumber: "+1 555 0111",
        },
        status: "active",
      })
      .expect(200);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "employee-active" },
        data: expect.objectContaining({
          firstName: "Marco",
          jobTitle: "Senior Backend Engineer",
          address: {
            upsert: {
              create: {
                address: "456 Updated Street",
                city: "Makati",
                province: "Metro Manila",
                country: "Philippines",
              },
              update: {
                address: "456 Updated Street",
                city: "Makati",
                province: "Metro Manila",
                country: "Philippines",
              },
            },
          },
          emergencyContact: {
            upsert: {
              create: {
                emergencyContactName: "Jules Reed",
                emergencyContactNumber: "+1 555 0111",
              },
              update: {
                emergencyContactName: "Jules Reed",
                emergencyContactNumber: "+1 555 0111",
              },
            },
          },
          status: "ACTIVE",
        }),
      }),
    );
    // The edit response reuses the HR profile shape so clients can refresh the profile screen directly.
    expect(response.body).toMatchObject({
      success: true,
      message: "Employee profile updated successfully",
      data: {
        id: "employee-active",
        firstName: "Marco",
        jobTitle: "Senior Backend Engineer",
        status: "active",
        personalEmail: "marcus.personal@example.com",
        address: {
          address: "123 Example Street",
          city: "Manila",
          province: "Metro Manila",
          country: "Philippines",
        },
        emergencyContact: {
          emergencyContactName: "Jamie Reed",
          emergencyContactNumber: "+1 555 0100",
        },
      },
    });
  });

  it("returns a shared API error response when the update body is empty", async () => {
    const response = await request(app)
      .patch("/api/v1/employees/employee-active")
      .send({})
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid employee profile update",
      errorCode: "INVALID_EMPLOYEE_PROFILE_UPDATE",
      errors: [
        {
          field: "body",
          message: "Employee profile update body is required",
          code: "INVALID_EMPLOYEE_PROFILE_UPDATE",
        },
      ],
    });
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns a validation error when supervisorId does not match an employee", async () => {
    findFirstMock.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/v1/employees/employee-active")
      .send({ supervisorId: "missing-supervisor" })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid employee profile update",
      errorCode: "INVALID_EMPLOYEE_PROFILE_UPDATE",
      errors: [
        {
          field: "supervisorId",
          message: "Supervisor not found",
          code: "INVALID_EMPLOYEE_PROFILE_UPDATE",
        },
      ],
    });
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "missing-supervisor",
        }),
      }),
    );
    expect(updateMock).not.toHaveBeenCalled();
  });
});
