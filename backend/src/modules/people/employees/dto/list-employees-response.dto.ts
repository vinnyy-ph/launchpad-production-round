import { PaginatedApiResponseDto } from "../../../../core/dto";
import type { EmployeeListItemResponseDto } from "./employee-list-item-response.dto";

/**
 * Paginated response returned by GET /api/employees.
 */
export class ListEmployeesResponseDto extends PaginatedApiResponseDto<EmployeeListItemResponseDto> {}
