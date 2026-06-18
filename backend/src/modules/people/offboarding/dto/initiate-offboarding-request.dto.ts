/**
 * Validated body for POST /api/v1/offboarding.
 * `clearanceTemplateId` is optional — the default template is used when omitted.
 * `newSupervisorId` is optional — when present, the offboardee's direct reports
 * and led teams are reassigned to that employee as part of initiation.
 */
export interface InitiateOffboardingRequestDto {
  employeeId: string;
  tenderDate: string;
  effectiveDate: string;
  clearanceTemplateId?: string;
  newSupervisorId?: string;
}
