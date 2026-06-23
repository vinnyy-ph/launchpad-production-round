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
  ListAllEmployeesResponseDto,
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
    const isPrivileged = PRIVILEGED_VIEWER_ROLES.includes(viewer.role);

    // Non-privileged callers may only scope the directory to their OWN reporting hierarchy.
    // Without this, reportingToId would expose any supervisor's org subtree to any employee.
    if (filters.reportingToId && !isPrivileged) {
      const viewerEmployee = await this.employeesRepository.findIdentityByUserId(viewer.userId);
      if (!viewerEmployee || viewerEmployee.id !== filters.reportingToId) {
        throw new Error("Forbidden reporting scope");
      }
    }

    const { employees, total } = await this.employeesRepository.findMany(filters);

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
   * Returns the entire directory in one non-paginated payload for the org chart.
   * Same redaction rules as the list: HR/Admin get full fields, everyone else a redacted item.
   */
  async listAllEmployees(
    viewer: EmployeeViewerContext,
  ): Promise<ListAllEmployeesResponseDto> {
    const isPrivileged = PRIVILEGED_VIEWER_ROLES.includes(viewer.role);
    const employees = await this.employeesRepository.findAllForDirectory();

    return {
      success: true,
      data: employees.map((employee) =>
        isPrivileged
          ? this.toListItemResponse(employee)
          : this.toRedactedListItemResponse(employee),
      ),
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

    const isPrivileged = PRIVILEGED_VIEWER_ROLES.includes(viewer.role);
    const isSelf = employee.userId === viewer.userId;

    // Object-level access control. A non-privileged viewer may only open their own profile,
    // their supervisor's, a direct report's, or a teammate's — anyone else is forbidden (not
    // merely redacted). HR/Admin and the subject themselves bypass the relationship check.
    if (!isPrivileged && !isSelf) {
      await this.assertCanViewProfile(viewer, employee);
    }

    const canSeeFullProfile = isPrivileged || isSelf;

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EMPLOYEE_RETRIEVED,
      data: canSeeFullProfile
        ? this.toProfileResponse(employee)
        : this.toRedactedProfileResponse(employee),
    };
  }

  /**
   * Authorizes a non-privileged, non-self viewer to read a profile. Allowed when the target is
   * the viewer's supervisor, a direct report of the viewer, or a teammate (shared team).
   * Throws "Profile not accessible" otherwise so the controller can answer 403.
   */
  private async assertCanViewProfile(
    viewer: EmployeeViewerContext,
    employee: NonNullable<RepositoryEmployeeProfile>,
  ): Promise<void> {
    const viewerEmployee = await this.employeesRepository.findIdentityByUserId(viewer.userId);

    if (viewerEmployee) {
      const targetIsMySupervisor = viewerEmployee.supervisorId === employee.id;
      const targetIsMyDirectReport = employee.supervisorId === viewerEmployee.id;

      if (
        targetIsMySupervisor ||
        targetIsMyDirectReport ||
        (await this.employeesRepository.shareTeam(viewerEmployee.id, employee.id))
      ) {
        return;
      }
    }

    throw new Error("Profile not accessible");
  }

  /**
   * Updates the caller's OWN profile (self-service). Resolves the employee from the auth user,
   * then applies the already field-restricted update through the shared update path so the same
   * validation and activity logging apply. The caller is recorded as the editor.
   */
  async updateMyProfile(
    userId: string,
    update: UpdateEmployeeProfileRequestDto,
  ): Promise<UpdateEmployeeProfileResponseDto> {
    const me = await this.employeesRepository.findIdentityByUserId(userId);

    if (!me) {
      throw new Error("Employee not found");
    }

    return this.updateEmployeeProfile({ employeeId: me.id }, update, userId);
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

        // Enforce same-department supervisorship: a supervisor must belong to the same
        // department as the employee. The employee's department may be changing in this
        // same request, so prefer the incoming department name and fall back to the
        // employee's currently stored department.
        const employee = await this.employeesRepository.findById(params.employeeId);

        if (!employee) {
          throw new Error("Employee not found");
        }

        const employeeDepartment =
          update.department !== undefined
            ? update.department
            : (employee.department?.name ?? null);
        const supervisorDepartment = supervisor.department?.name ?? null;

        // Cross-department assignment is allowed only when the chosen supervisor is the
        // organization root (e.g. the CEO, who has no supervisor). This lets a department
        // head report upward across departments while keeping every other assignment
        // confined to a single department.
        const supervisorIsRoot = supervisor.supervisorId === null;

        if (employeeDepartment !== supervisorDepartment && !supervisorIsRoot) {
          throw new Error("Supervisor must belong to the same department");
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
      avatarUrl: employee.user?.avatarUrl ?? null,
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
      avatarUrl: employee.user.avatarUrl,
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
      avatarUrl: employee.user.avatarUrl,
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
