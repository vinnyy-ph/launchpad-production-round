/**
 * Request body for POST /api/v1/onboarding.
 * All four fields are required to onboard a new employee.
 */
export interface OnboardEmployeeRequestDto {
  companyEmail: string;
  jobTitle: string;
  supervisorId: string;
  department: string;
}
