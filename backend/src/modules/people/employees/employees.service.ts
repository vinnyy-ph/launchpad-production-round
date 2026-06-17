import type { EmployeeStatus } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import { EmployeesRepository } from "./employees.repository";
import type {
  EmployeeProfileResponseDto,
  EmployeeListItemResponseDto,
  EmployeeStatusDto,
  GetEmployeeProfileParamsDto,
  ListEmployeesQueryDto,
  ListEmployeesResponseDto,
  UpdateEmployeeProfileParamsDto,
  UpdateEmployeeProfileRequestDto,
  UpdateEmployeeProfileResponseDto,
} from "./dto";

type RepositoryEmployee = Awaited<ReturnType<EmployeesRepository["findMany"]>>["employees"][number];
type RepositoryEmployeeProfile = Awaited<ReturnType<EmployeesRepository["findById"]>>;

/**
 * Coordinates employee list behavior and maps database records into response DTOs.
 */
export class EmployeesService {
  constructor(private readonly employeesRepository = new EmployeesRepository()) {}

  /**
   * Lists employees with optional search/filter criteria and pagination metadata.
   */
  async listEmployees(filters: ListEmployeesQueryDto): Promise<ListEmployeesResponseDto> {
    const { employees, total } = await this.employeesRepository.findMany(filters);

    return {
      success: true,
      data: employees.map((employee) => this.toListItemResponse(employee)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  /**
   * Returns an unredacted employee profile for HR directory views.
   */
  async getEmployeeProfile(
    params: GetEmployeeProfileParamsDto,
  ): Promise<EmployeeProfileResponseDto> {
    const employee = await this.employeesRepository.findById(params.employeeId);

    if (!employee) {
      throw new Error("Employee not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EMPLOYEE_RETRIEVED,
      data: this.toProfileResponse(employee),
    };
  }

  /**
   * Updates another employee profile for HR and returns the refreshed unredacted profile.
   */
  async updateEmployeeProfile(
    params: UpdateEmployeeProfileParamsDto,
    update: UpdateEmployeeProfileRequestDto,
    updatedBy = "hr-profile-edit",
  ): Promise<UpdateEmployeeProfileResponseDto> {
    if (update.supervisorId !== undefined) {
      await this.assertValidSupervisorAssignment(params.employeeId, update.supervisorId);
    }

    const employee = await this.employeesRepository.updateProfile(
      params.employeeId,
      update,
      updatedBy,
    );

    if (!employee) {
      throw new Error("Employee not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EMPLOYEE_PROFILE_UPDATED,
      data: this.toProfileResponse(employee),
    };
  }

  /**
   * Converts a Prisma employee result into the API response DTO.
   * This keeps database enum casing and relation structure from leaking to API consumers.
   */
  private toListItemResponse(employee: RepositoryEmployee): EmployeeListItemResponseDto {
    return {
      id: employee.id,
      userId: employee.userId,
      companyEmail: employee.companyEmail,
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName,
      fullName: this.buildFullName(employee.firstName, employee.middleName, employee.lastName),
      jobTitle: employee.jobTitle,
      department: employee.department?.name ?? null,
      status: this.toStatusDto(employee.status),
      teams: employee.teamMemberships.map((membership) => ({
        id: membership.team.id,
        name: membership.team.name,
      })),
      supervisor: employee.supervisor
        ? {
            id: employee.supervisor.id,
            firstName: employee.supervisor.firstName,
            lastName: employee.supervisor.lastName,
            companyEmail: employee.supervisor.companyEmail,
            fullName: this.buildFullName(
              employee.supervisor.firstName,
              null,
              employee.supervisor.lastName,
            ),
            jobTitle: employee.supervisor.jobTitle,
          }
        : null,
    };
  }

  /**
   * Converts a Prisma employee profile into the HR-facing response DTO.
   * No HR redaction is applied here because this endpoint is intended for HR profile access.
   */
  private toProfileResponse(employee: NonNullable<RepositoryEmployeeProfile>) {
    return {
      id: employee.id,
      userId: employee.userId,
      user: {
        id: employee.user.id,
        email: employee.user.email,
        role: employee.user.role,
        isActive: employee.user.isActive,
      },
      companyEmail: employee.companyEmail,
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName,
      fullName: this.buildFullName(employee.firstName, employee.middleName, employee.lastName),
      personalEmail: employee.personalEmail,
      birthday: employee.birthday,
      address: employee.address,
      emergencyContact: employee.emergencyContact,
      jobTitle: employee.jobTitle,
      department: employee.department?.name ?? null,
      status: this.toStatusDto(employee.status),
      teams: employee.teamMemberships.map((membership) => ({
        id: membership.team.id,
        name: membership.team.name,
      })),
      ledTeams: employee.ledTeams.map((team) => ({
        id: team.id,
        name: team.name,
      })),
      supervisor: employee.supervisor
        ? {
            id: employee.supervisor.id,
            firstName: employee.supervisor.firstName,
            lastName: employee.supervisor.lastName,
            companyEmail: employee.supervisor.companyEmail,
            fullName: this.buildFullName(
              employee.supervisor.firstName,
              null,
              employee.supervisor.lastName,
            ),
            jobTitle: employee.supervisor.jobTitle,
          }
        : null,
      directReports: employee.directReports.map((directReport) => ({
        id: directReport.id,
        firstName: directReport.firstName,
        lastName: directReport.lastName,
        companyEmail: directReport.companyEmail,
        fullName: this.buildFullName(directReport.firstName, null, directReport.lastName),
        jobTitle: directReport.jobTitle,
        status: this.toStatusDto(directReport.status),
      })),
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  /** Builds a display name while safely skipping missing middle names. */
  private buildFullName(firstName: string, middleName: string | null, lastName: string): string {
    return [firstName, middleName, lastName].filter(Boolean).join(" ");
  }

  /** Maps Prisma's uppercase status enum to the lowercase API response contract. */
  private toStatusDto(status: EmployeeStatus): EmployeeStatusDto {
    return status.toLowerCase() as EmployeeStatusDto;
  }

  /**
   * Enforces org-chart invariants before HR changes an employee's supervisor.
   */
  private async assertValidSupervisorAssignment(employeeId: string, supervisorId: string | null) {
    if (supervisorId === employeeId) {
      throw new Error("Employee cannot supervise themselves");
    }

    if (supervisorId) {
      const supervisor = await this.employeesRepository.findById(supervisorId);

      if (!supervisor) {
        throw new Error("Supervisor not found");
      }
    }

    const employee = await this.employeesRepository.findSupervisorLink(employeeId);

    if (!employee) {
      throw new Error("Employee not found");
    }

    if (supervisorId) {
      await this.assertSupervisorChainDoesNotCycle(employeeId, supervisorId);
    }

    await this.assertExactlyOneRootAfterSupervisorChange(employee.id, employee.supervisorId, supervisorId);
  }

  /**
   * Walks upward from the proposed supervisor and rejects descendant-to-ancestor cycles.
   */
  private async assertSupervisorChainDoesNotCycle(employeeId: string, supervisorId: string) {
    const visitedEmployeeIds = new Set<string>();
    let currentSupervisorId: string | null = supervisorId;

    while (currentSupervisorId) {
      if (currentSupervisorId === employeeId || visitedEmployeeIds.has(currentSupervisorId)) {
        throw new Error("Circular supervisor relationship is not allowed");
      }

      visitedEmployeeIds.add(currentSupervisorId);
      const supervisor = await this.employeesRepository.findSupervisorLink(currentSupervisorId);
      currentSupervisorId = supervisor?.supervisorId ?? null;
    }
  }

  /**
   * Ensures the org chart keeps exactly one employee without a supervisor after the edit.
   */
  private async assertExactlyOneRootAfterSupervisorChange(
    employeeId: string,
    currentSupervisorId: string | null,
    nextSupervisorId: string | null,
  ) {
    const rootCountExcludingEmployee = await this.employeesRepository.countRootEmployees(employeeId);
    const employeeWillBeRoot = nextSupervisorId === null;
    const finalRootCount = rootCountExcludingEmployee + (employeeWillBeRoot ? 1 : 0);

    if (finalRootCount !== 1) {
      throw new Error(
        currentSupervisorId === null && nextSupervisorId !== null
          ? "Root employee must not have a supervisor"
          : "Exactly one root employee is required",
      );
    }
  }
}
