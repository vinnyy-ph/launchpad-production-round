import type { EmployeeStatus } from "@prisma/client";
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
    if (update.supervisorId === params.employeeId) {
      throw new Error("Employee cannot supervise themselves");
    }

    if (update.supervisorId) {
      const supervisor = await this.employeesRepository.findById(update.supervisorId);

      if (!supervisor) {
        throw new Error("Supervisor not found");
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
