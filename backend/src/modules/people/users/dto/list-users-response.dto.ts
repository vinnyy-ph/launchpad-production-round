import { PaginatedApiResponseDto } from "../../../../core/dto";
import type { UserListItemDto } from "./user-list-item.dto";

/**
 * Paginated response returned by GET /api/v1/users.
 */
export class ListUsersResponseDto extends PaginatedApiResponseDto<UserListItemDto> {}
