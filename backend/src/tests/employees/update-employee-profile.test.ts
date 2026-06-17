import request from "supertest";
import { app } from "../../app";
import {
  buildEmployeeProfileRecord,
  buildSupervisorLink,
  countMock,
  findFirstMock,
  resetEmployeeMocks,
  updateMock,
} from "./employees-test.helpers";

// Mock auth because this endpoint is temporarily unauthenticated while API behavior is tested.
jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
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
        status: "active",
      })
      .expect(200);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "employee-active" },
        data: expect.objectContaining({
          firstName: "Marco",
          jobTitle: "Senior Backend Engineer",
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
        where: {
          id: "missing-supervisor",
        },
      }),
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("sets exactly one supervisor for an employee", async () => {
    const existingProfile = buildEmployeeProfileRecord();
    const updatedProfile = {
      ...existingProfile,
      supervisor: {
        id: "supervisor-2",
        firstName: "Nia",
        lastName: "Santos",
        companyEmail: "nia.santos@example.com",
        jobTitle: "Engineering Director",
      },
    };

    findFirstMock
      .mockResolvedValueOnce({ ...buildEmployeeProfileRecord(), id: "supervisor-2" })
      .mockResolvedValueOnce(buildSupervisorLink("employee-active", "supervisor-1"))
      .mockResolvedValueOnce(buildSupervisorLink("supervisor-2", null))
      .mockResolvedValueOnce(existingProfile);
    countMock.mockResolvedValue(1);
    updateMock.mockResolvedValue(updatedProfile);

    const response = await request(app)
      .patch("/api/v1/employees/employee-active")
      .send({ supervisorId: "supervisor-2" })
      .expect(200);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "employee-active" },
        data: expect.objectContaining({
          supervisor: { connect: { id: "supervisor-2" } },
        }),
      }),
    );
    expect(response.body.data.supervisor).toMatchObject({
      id: "supervisor-2",
      fullName: "Nia Santos",
    });
  });

  it("rejects circular supervisor relationships", async () => {
    findFirstMock
      .mockResolvedValueOnce({ ...buildEmployeeProfileRecord(), id: "direct-report-1" })
      .mockResolvedValueOnce(buildSupervisorLink("employee-active", "supervisor-1"))
      .mockResolvedValueOnce(buildSupervisorLink("direct-report-1", "employee-active"));

    const response = await request(app)
      .patch("/api/v1/employees/employee-active")
      .send({ supervisorId: "direct-report-1" })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Invalid employee profile update",
      errors: [
        {
          field: "supervisorId",
          message: "Circular supervisor relationship is not allowed",
        },
      ],
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects clearing a supervisor when another root already exists", async () => {
    findFirstMock.mockResolvedValueOnce(buildSupervisorLink("employee-active", "supervisor-1"));
    countMock.mockResolvedValue(1);

    const response = await request(app)
      .patch("/api/v1/employees/employee-active")
      .send({ supervisorId: null })
      .expect(400);

    expect(countMock).toHaveBeenCalledWith({
      where: {
        supervisorId: null,
        id: { not: "employee-active" },
      },
    });
    expect(response.body).toMatchObject({
      success: false,
      message: "Invalid employee profile update",
      errors: [
        {
          field: "supervisorId",
          message: "Exactly one root employee is required",
        },
      ],
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects assigning a supervisor to the only root employee", async () => {
    findFirstMock
      .mockResolvedValueOnce({ ...buildEmployeeProfileRecord(), id: "supervisor-2" })
      .mockResolvedValueOnce(buildSupervisorLink("employee-active", null))
      .mockResolvedValueOnce(buildSupervisorLink("supervisor-2", null));
    countMock.mockResolvedValue(0);

    const response = await request(app)
      .patch("/api/v1/employees/employee-active")
      .send({ supervisorId: "supervisor-2" })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Invalid employee profile update",
      errors: [
        {
          field: "supervisorId",
          message: "Root employee must not have a supervisor",
        },
      ],
    });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
