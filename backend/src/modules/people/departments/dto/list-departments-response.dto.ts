import { PaginatedApiResponseDto } from "../../../../core/dto";
import type { DepartmentListItemResponseDto } from "./department-list-item-response.dto";

/**
 * Paginated response returned by GET /api/v1/departments.
 */
export class ListDepartmentsResponseDto extends PaginatedApiResponseDto<DepartmentListItemResponseDto> {}
