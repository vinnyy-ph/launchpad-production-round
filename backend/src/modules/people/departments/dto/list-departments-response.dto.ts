import type { DepartmentResponseDto } from "./department-response.dto";

/** Success envelope returned by GET /api/v1/departments. */
export interface ListDepartmentsResponseDto {
  data: DepartmentResponseDto[];
}
