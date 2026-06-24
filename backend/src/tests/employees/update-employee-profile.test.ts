import request from "supertest";
import { app } from "../../app";
import {
  activityLogCreateManyMock,
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
// updateProfile runs inside prisma.$transaction and writes activity-log entries, so the
// mock exposes a transaction that runs the callback against the same mocked client.
jest.mock("../../core/database/prisma.service", () => {
  // Explicit type breaks the circular inference (prisma referenced in its own
  // $transaction initializer), which otherwise trips TS7022/TS7024 under `tsc`.
  const prisma: {
    employee: { findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    activityLog: { createMany: jest.Mock };
    $transaction: jest.Mock;
  } = {
    employee: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    activityLog: { createMany: jest.fn() },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
  };
  return { prisma };
});

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

    // The first findFirst is the pre-update read used for diffing; later calls — the editor
    // lookup and the post-commit profile refresh — see the updated record.
    findFirstMock.mockResolvedValueOnce(existingProfile);
    findFirstMock.mockResolvedValue(updatedProfile);
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

  it("persists canonical phone format without logging when only formatting changed", async () => {
    const existingProfile = {
      ...buildEmployeeProfileRecord(),
      emergencyContact: {
        emergencyContactName: "Jamie Reed",
        emergencyContactNumber: "+63 909 123 4567",
      },
    };
    const updatedProfile = {
      ...existingProfile,
      firstName: "Marco",
    };

    findFirstMock
      .mockResolvedValueOnce(existingProfile)
      .mockResolvedValueOnce({ id: "editor-employee" })
      .mockResolvedValue(updatedProfile);
    updateMock.mockResolvedValue(updatedProfile);

    await request(app)
      .patch("/api/v1/employees/employee-active")
      .send({
        firstName: "Marco",
        emergencyContact: {
          emergencyContactName: "Jamie Reed",
          emergencyContactNumber: "+639091234567",
        },
      })
      .expect(200);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emergencyContact: {
            upsert: {
              create: {
                emergencyContactName: "Jamie Reed",
                emergencyContactNumber: "+639091234567",
              },
              update: {
                emergencyContactName: "Jamie Reed",
                emergencyContactNumber: "+639091234567",
              },
            },
          },
        }),
      }),
    );
    expect(activityLogCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          fieldName: "firstName",
          oldValue: "Marcus",
          newValue: "Marco",
        }),
      ],
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
