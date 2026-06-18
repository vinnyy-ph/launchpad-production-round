import type { EmployeeStatus } from "@prisma/client";
import type { UpdateEmployeeAddressRequestDto } from "./update-employee-address-request.dto";
import type { UpdateEmployeeEmergencyContactRequestDto } from "./update-employee-emergency-contact-request.dto";

/**
 * Request body for HR employee profile edits.
 * Nullable fields can be sent as null when HR needs to clear existing profile data.
 */
export interface UpdateEmployeeProfileRequestDto {
  companyEmail?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  personalEmail?: string | null;
  birthday?: Date | null;
  address?: UpdateEmployeeAddressRequestDto | null;
  emergencyContact?: UpdateEmployeeEmergencyContactRequestDto | null;
  jobTitle?: string | null;
  department?: string | null;
  supervisorId?: string | null;
  status?: EmployeeStatus;
}
