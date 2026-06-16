import { ApiSuccessResponseDto } from "./api-success-response.dto";
import type { PaginationMetaDto } from "./pagination-meta.dto";

/**
 * Standard success envelope for paginated collection responses.
 * The `data` payload contains the current page items and `meta` describes the full result set.
 */
export class PaginatedApiResponseDto<TItem> extends ApiSuccessResponseDto<TItem[]> {
  meta!: PaginationMetaDto;
}
