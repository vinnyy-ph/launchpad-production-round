import type { EmployeeStatus } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import type {
  AddUserRequestDto,
  CreateUserResponseDto,
  DeactivateUserResponseDto,
  ListUsersQueryDto,
  ListUsersResponseDto,
  UpdateRoleRequestDto,
  UpdateRoleResponseDto,
  UserListItemDto,
  UserResponseDto,
} from "./dto";
import { UsersRepository } from "./users.repository";

type RepositoryUser = Awaited<ReturnType<UsersRepository["findById"]>>;
type RepositoryUserListItem = Awaited<
  ReturnType<UsersRepository["findAll"]>
>["users"][number];

/**
 * Coordinates user management behavior and maps database records into response DTOs.
 */
export class UsersService {
  constructor(private readonly usersRepository = new UsersRepository()) {}

  /**
   * Creates a new HR or Employee account with a linked employee profile.
   */
  async addUser(dto: AddUserRequestDto): Promise<CreateUserResponseDto> {
    const emailExists = await this.usersRepository.existsByEmail(dto.email);

    if (emailExists) {
      throw new Error("User already exists");
    }

    const user = await this.usersRepository.createUserWithEmployee(dto);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.USER_CREATED,
      data: this.toUserResponse(user!),
    };
  }

  /**
   * Deactivates a user account without deleting records or triggering offboarding.
   */
  async deactivateUser(
    userId: string,
    requestingUserId: string,
  ): Promise<DeactivateUserResponseDto> {
    if (userId === requestingUserId) {
      throw new Error("Cannot deactivate yourself");
    }

    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isActive) {
      throw new Error("User already deactivated");
    }

    if (user.role === "ADMIN") {
      const activeAdminCount = await this.usersRepository.countActiveAdmins();

      if (activeAdminCount <= 1) {
        throw new Error("Cannot deactivate last admin");
      }
    }

    const deactivatedUser = await this.usersRepository.setActive(userId, false);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.USER_DEACTIVATED,
      data: this.toUserResponse(deactivatedUser),
    };
  }

  /**
   * Updates a user's role between HR and Employee.
   */
  async updateRole(
    userId: string,
    dto: UpdateRoleRequestDto,
    requestingUserId: string,
  ): Promise<UpdateRoleResponseDto> {
    if (userId === requestingUserId) {
      throw new Error("Cannot change own role");
    }

    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isActive) {
      throw new Error("User already deactivated");
    }

    if (user.role === "ADMIN") {
      throw new Error("Cannot change admin role");
    }

    const updatedUser = await this.usersRepository.updateRole(userId, dto.role);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.USER_ROLE_UPDATED,
      data: this.toUserResponse(updatedUser),
    };
  }

  /**
   * Returns a paginated list of users for admin management views.
   */
  async listUsers(filters: ListUsersQueryDto): Promise<ListUsersResponseDto> {
    const { users, total } = await this.usersRepository.findAll(filters);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.USERS_RETRIEVED,
      data: users.map((user) => this.toListItemResponse(user)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  private toListItemResponse(user: RepositoryUserListItem): UserListItemDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      employeeId: user.employee?.id ?? null,
      firstName: user.employee?.firstName ?? null,
      lastName: user.employee?.lastName ?? null,
      fullName: this.buildFullName(user.employee?.firstName, user.employee?.lastName),
      employeeStatus: user.employee ? this.toEmployeeStatusDto(user.employee.status) : null,
      createdAt: user.createdAt,
    };
  }

  private toUserResponse(user: NonNullable<RepositoryUser>): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      employeeId: user.employee?.id ?? null,
      firstName: user.employee?.firstName ?? null,
      lastName: user.employee?.lastName ?? null,
      fullName: this.buildFullName(user.employee?.firstName, user.employee?.lastName),
      employeeStatus: user.employee ? this.toEmployeeStatusDto(user.employee.status) : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private buildFullName(
    firstName: string | null | undefined,
    lastName: string | null | undefined,
  ): string | null {
    if (!firstName && !lastName) {
      return null;
    }

    return [firstName, lastName].filter(Boolean).join(" ");
  }

  private toEmployeeStatusDto(status: EmployeeStatus): string {
    return status.toLowerCase();
  }
}
