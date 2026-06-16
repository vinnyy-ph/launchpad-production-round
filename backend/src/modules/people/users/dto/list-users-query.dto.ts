import type { Role } from "@prisma/client";

/**
 * Normalized query parameters for GET /api/v1/users.
 */
export interface ListUsersQueryDto {
  page: number;
  limit: number;
  role?: Role;
  isActive?: boolean;
  includeDeactivated?: boolean;
}
