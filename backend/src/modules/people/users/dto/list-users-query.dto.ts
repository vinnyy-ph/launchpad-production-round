import type { Role } from "@prisma/client";
import type { USER_SORT_FIELDS, USER_SORT_ORDERS } from "../users.constants";

/**
 * Normalized query parameters for GET /api/v1/users.
 */
export interface ListUsersQueryDto {
  page: number;
  limit: number;
  role?: Role;
  isActive?: boolean;
  includeDeactivated?: boolean;
  sortBy?: (typeof USER_SORT_FIELDS)[number];
  sortOrder?: (typeof USER_SORT_ORDERS)[number];
}
