import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import { DepartmentsRepository } from "./departments.repository";
import type {
  CreateDepartmentRequestDto,
  DepartmentListItemResponseDto,
  DepartmentMutationResponseDto,
  DepartmentParamsDto,
  ListDepartmentsQueryDto,
  ListDepartmentsResponseDto,
  UpdateDepartmentRequestDto,
} from "./dto";

type RepositoryDepartment = NonNullable<Awaited<ReturnType<DepartmentsRepository["findById"]>>>;

/**
 * Business service for organization departments.
 * Owns the rules around unique naming, restoring soft-deleted departments,
 * and blocking deletion while employees are still assigned.
 */
export class DepartmentsService {
  constructor(private readonly departmentsRepository = new DepartmentsRepository()) {}

  /** Lists active departments with pagination metadata for the HR management table. */
  async listDepartments(
    filters: ListDepartmentsQueryDto,
  ): Promise<ListDepartmentsResponseDto> {
    const { departments, total } = await this.departmentsRepository.findMany(filters);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DEPARTMENTS_RETRIEVED,
      data: departments.map((department) => this.toListItem(department)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  /**
   * Creates a department. Rejects names already taken by another active department and
   * transparently restores a previously soft-deleted department that holds the same name,
   * which also keeps the unique name constraint satisfied.
   */
  async createDepartment(
    body: CreateDepartmentRequestDto,
  ): Promise<DepartmentMutationResponseDto> {
    await this.assertNameAvailable(body.name);

    const existing = await this.departmentsRepository.findByName(body.name);
    const department =
      existing && existing.deletedAt
        ? await this.departmentsRepository.restore(existing.id, body.name)
        : await this.departmentsRepository.create(body.name);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DEPARTMENT_CREATED,
      data: this.toListItem(department),
    };
  }

  /** Renames an active department after confirming the new name is free. */
  async updateDepartment(
    params: DepartmentParamsDto,
    body: UpdateDepartmentRequestDto,
  ): Promise<DepartmentMutationResponseDto> {
    const current = await this.departmentsRepository.findById(params.departmentId);

    if (!current) {
      throw new Error("Department not found");
    }

    await this.assertNameAvailable(body.name, params.departmentId);

    const department = await this.departmentsRepository.update(params.departmentId, body.name);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DEPARTMENT_UPDATED,
      data: this.toListItem(department),
    };
  }

  /**
   * Soft-deletes a department. Blocked while any employee is still assigned to it,
   * so reporting and employee records never lose their department reference.
   */
  async deleteDepartment(
    params: DepartmentParamsDto,
  ): Promise<DepartmentMutationResponseDto> {
    const current = await this.departmentsRepository.findById(params.departmentId);

    if (!current) {
      throw new Error("Department not found");
    }

    const employeeCount = await this.departmentsRepository.countEmployees(params.departmentId);

    if (employeeCount > 0) {
      throw new Error("Department has assigned employees");
    }

    const department = await this.departmentsRepository.softDelete(params.departmentId);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DEPARTMENT_DELETED,
      data: this.toListItem(department),
    };
  }

  /**
   * Throws when an active department already uses the name (case-insensitive), or when
   * another department — including a soft-deleted one — holds the exact name and so would
   * collide with the unique constraint on rename.
   */
  private async assertNameAvailable(name: string, excludeId?: string): Promise<void> {
    const activeConflict = await this.departmentsRepository.findActiveByNameInsensitive(
      name,
      excludeId,
    );

    if (activeConflict) {
      throw new Error("Department already exists");
    }

    if (excludeId) {
      const exact = await this.departmentsRepository.findByName(name);
      if (exact && exact.id !== excludeId) {
        throw new Error("Department already exists");
      }
    }
  }

  /** Maps a Prisma department record into the API response DTO. */
  private toListItem(department: RepositoryDepartment): DepartmentListItemResponseDto {
    return {
      id: department.id,
      name: department.name,
      employeeCount: department._count.employees,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };
  }
}
