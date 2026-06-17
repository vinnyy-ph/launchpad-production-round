import type { Role } from "@prisma/client";

/**
 * Request body for PATCH /api/v1/users/:userId/role.
 */
export interface UpdateRoleRequestDto {
  role: Extract<Role, "HR" | "EMPLOYEE">;
}
