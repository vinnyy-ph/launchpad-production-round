/**
 * Emergency contact fields accepted when HR edits an employee profile.
 * A null parent emergencyContact clears the stored contact row.
 */
export interface UpdateEmployeeEmergencyContactRequestDto {
  emergencyContactName?: string | null;
  emergencyContactNumber?: string | null;
}
