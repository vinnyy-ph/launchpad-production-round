import { ApiSuccessResponseDto } from "../../../../core/dto";
import type { DepartmentListItemResponseDto } from "./department-list-item-response.dto";

/**
 * Success envelope returned by the create, update, and delete department endpoints.
 * Returns the affected department so the client can refresh without a re-fetch.
 */
export class DepartmentMutationResponseDto extends ApiSuccessResponseDto<DepartmentListItemResponseDto> {}
