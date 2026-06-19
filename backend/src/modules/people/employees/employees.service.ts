import type { EmployeeStatus, Role } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import { EmployeesRepository } from "./employees.repository";
import type {
  EmployeeAddressResponseDto,
  EmployeeEmergencyContactResponseDto,
  EmployeeProfileResponseDto,
  EmployeeListItemResponseDto,
  EmployeeStatusDto,
  GetEmployeeProfileParamsDto,
  ListEmployeesQueryDto,
  ListEmployeesResponseDto,
  RedactedEmployeeProfileDto,
  UpdateEmployeeProfileParamsDto,
  UpdateEmployeeProfileRequestDto,
  UpdateEmployeeProfileResponseDto,
} from "./dto";

type RepositoryEmployee = Awaited<ReturnType<EmployeesRepository["findMany"]>>["employees"][number];
type RepositoryEmployeeProfile = Awaited<ReturnType<EmployeesRepository["findById"]>>;

/**
 * The authenticated caller's identity, used to decide full vs. redacted serialization.
 * Resolved from req.user (a User row) by the controller.
 */
export interface EmployeeViewerContext {
  userId: string;
  role: Role;
}

/** Roles that may see unredacted PII (personalEmail, birthday, address, emergencyContact). */
const PRIVILEGED_VIEWER_ROLES: Role[] = ["ADMIN", "HR"];

/**
 * Coordinates employee list behavior and maps database records into response DTOs.
 */
export class EmployeesService {
  constructor(private readonly employeesRepository = new EmployeesRepository()) {}

  /**
   * Lists employees with optional search/filter criteria and pagination metadata.
   * HR and Admin receive the full directory fields; every other authenticated viewer
   * receives a redacted list with sensitive fields (address, emergencyContact) omitted.
   */
  async listEmployees(
    filters: ListEmployeesQueryDto,
    viewer: EmployeeViewerContext,
  ): Promise<ListEmployeesResponseDto> {
    const { employees, total } = await this.employeesRepository.findMany(filters);
    const isPrivileged = PRIVILEGED_VIEWER_ROLES.includes(viewer.role);

    return {
      success: true,
      data: employees.map((employee) =>
        isPrivileged
          ? this.toListItemResponse(employee)
          : this.toRedactedListItemResponse(employee),
      ),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  /**
   * Returns an employee profile, redacted per the caller's relationship to the subject.
   * Full profile for Admin, HR, or the subject themselves; redacted profile for everyone
   * else (supervisors of the subject and any other authenticated peer). Redaction is applied
   * here, server-side, so sensitive fields never reach an unauthorized payload.
   */
  async getEmployeeProfile(
    params: GetEmployeeProfileParamsDto,
    viewer: EmployeeViewerContext,
  ): Promise<EmployeeProfileResponseDto> {
    const employee = await this.employeesRepository.findById(params.employeeId);

    if (!employee) {
      throw new Error("Employee not found");
    }

    const canSeeFullProfile =
      PRIVILEGED_VIEWER_ROLES.includes(viewer.role) || employee.userId === viewer.userId;

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EMPLOYEE_RETRIEVED,
      data: canSeeFullProfile
        ? this.toProfileResponse(employee)
        : this.toRedactedProfileResponse(employee),
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
    if (update.supervisorId === params.employeeId) {
      throw new Error("Employee cannot supervise themselves");
    }

    if (update.supervisorId !== undefined) {
      if (update.supervisorId) {
        const supervisor = await this.employeesRepository.findById(update.supervisorId);

        if (!supervisor) {
          throw new Error("Supervisor not found");
        }

        const hasCycle = await this.employeesRepository.wouldCreateCycle(
          params.employeeId,
          update.supervisorId,
        );

        if (hasCycle) {
          throw new Error("Circular supervisory relationship detected");
        }
      } else {
        // Clearing the supervisor — enforce the single root node constraint.
        const existingRootCount = await this.employeesRepository.countRootEmployees(
          params.employeeId,
        );

        if (existingRootCount > 0) {
          throw new Error("Another employee is already the root node");
        }
      }
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
      address: this.toAddressResponse(employee.address),
      emergencyContact: this.toEmergencyContactResponse(employee.emergencyContact),
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
   * Converts a Prisma employee result into a REDACTED list item for non-HR/Admin viewers.
   * Drops sensitive fields (address, emergencyContact) so they never reach the payload.
   */
  private toRedactedListItemResponse(employee: RepositoryEmployee): EmployeeListItemResponseDto {
    const fullItem = this.toListItemResponse(employee);
    const { address: _address, emergencyContact: _emergencyContact, ...redacted } = fullItem;
    return redacted;
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
      address: this.toAddressResponse(employee.address),
      emergencyContact: this.toEmergencyContactResponse(employee.emergencyContact),
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

  /**
   * Converts a Prisma employee profile into a REDACTED profile for viewers who are not
   * HR, Admin, or the subject (supervisors of the subject and any other authenticated peer).
   * Drops the sensitive fields (personalEmail, birthday, address, emergencyContact) server-side;
   * keeps directory-safe identity, work, team, and supervisor data.
   */
  private toRedactedProfileResponse(
    employee: NonNullable<RepositoryEmployeeProfile>,
  ): RedactedEmployeeProfileDto {
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
    };
  }

  /** Builds a display name while safely skipping missing middle names. */
  private buildFullName(firstName: string, middleName: string | null, lastName: string): string {
    return [firstName, middleName, lastName].filter(Boolean).join(" ");
  }

  /** Maps the optional employee address relation into the public DTO shape. */
  private toAddressResponse(
    address: {
      address: string | null;
      city: string | null;
      province: string | null;
      country: string | null;
    } | null,
  ): EmployeeAddressResponseDto | null {
    if (!address) {
      return null;
    }

    return {
      address: address.address,
      city: address.city,
      province: address.province,
      country: address.country,
    };
  }

  /** Maps the optional emergency contact relation into the public DTO shape. */
  private toEmergencyContactResponse(
    emergencyContact: {
      emergencyContactName: string | null;
      emergencyContactNumber: string | null;
    } | null,
  ): EmployeeEmergencyContactResponseDto | null {
    if (!emergencyContact) {
      return null;
    }

    return {
      emergencyContactName: emergencyContact.emergencyContactName,
      emergencyContactNumber: emergencyContact.emergencyContactNumber,
    };
  }

  /** Maps Prisma's uppercase status enum to the lowercase API response contract. */
  private toStatusDto(status: EmployeeStatus): EmployeeStatusDto {
    return status.toLowerCase() as EmployeeStatusDto;
  }
}
