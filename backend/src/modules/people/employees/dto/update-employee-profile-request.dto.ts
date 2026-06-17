import type { EmployeeStatus } from "@prisma/client";

/**
 * Request body for HR employee profile edits.
 * Nullable fields can be sent as null when HR needs to clear existing profile data.
 * supervisorId must preserve one root employee and cannot create circular reporting.
 */
export interface UpdateEmployeeProfileRequestDto {
  companyEmail?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  personalEmail?: string | null;
  birthday?: Date | null;
  address?: string | null;
  emergencyContact?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  supervisorId?: string | null;
  status?: EmployeeStatus;
}
