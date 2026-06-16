import type { Role } from "@prisma/client";

/**
 * Auth account details linked to an employee profile.
 * HR profile views intentionally include this because HR can view unredacted employee records.
 */
export interface EmployeeUserResponseDto {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}
