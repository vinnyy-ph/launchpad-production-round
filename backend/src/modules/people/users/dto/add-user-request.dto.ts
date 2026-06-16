import type { Role } from "@prisma/client";

/**
 * Request body for POST /api/v1/users.
 */
export interface AddUserRequestDto {
  email: string;
  role: Extract<Role, "HR" | "EMPLOYEE">;
  firstName: string;
  lastName: string;
}
