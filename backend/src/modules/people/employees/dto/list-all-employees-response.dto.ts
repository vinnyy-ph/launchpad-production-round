import { ApiSuccessResponseDto } from "../../../../core/dto";
import type { EmployeeListItemResponseDto } from "./employee-list-item-response.dto";

/**
 * Non-paginated response returned by GET /api/v1/employees/all.
 * Returns the entire directory in one payload so the org chart can build the full
 * supervisor hierarchy without dropping people across page boundaries.
 */
export class ListAllEmployeesResponseDto extends ApiSuccessResponseDto<
  EmployeeListItemResponseDto[]
> {}
