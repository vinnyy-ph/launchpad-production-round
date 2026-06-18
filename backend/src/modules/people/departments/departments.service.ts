import type { ListDepartmentsResponseDto } from "./dto";
import { DepartmentsRepository } from "./departments.repository";

/** Business service for organization departments. */
export class DepartmentsService {
  constructor(private readonly departmentsRepository = new DepartmentsRepository()) {}

  /** Returns departments available for HR employee profile edits. */
  async listDepartments(): Promise<ListDepartmentsResponseDto> {
    const departments = await this.departmentsRepository.findMany();
    return { data: departments };
  }
}
