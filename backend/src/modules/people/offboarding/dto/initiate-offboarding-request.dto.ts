/**
 * Validated body for POST /api/v1/offboarding.
 * `clearanceTemplateId` is optional — the default template is used when omitted.
 * `attachmentUrl` is optional — populated by the API when HR uploads an attachment.
 * `newSupervisorId` is required when the offboardee has direct reports.
 * `newTeamLeaderId` is required when the offboardee leads teams.
 */
export interface InitiateOffboardingRequestDto {
  employeeId: string;
  tenderDate: string;
  effectiveDate: string;
  clearanceTemplateId?: string;
  attachmentUrl?: string;
  newSupervisorId?: string;
  newTeamLeaderId?: string;
}
