/** A single uploaded offboarding attachment after server-side storage. */
export interface OffboardingAttachmentInput {
  /** Cloudinary storage key (`public_id|resource_type`). */
  url: string;
  /** Original file name as uploaded. */
  fileName: string;
}

/**
 * Validated body for POST /api/v1/offboarding.
 * `clearanceTemplateId` is optional — the default template is used when omitted.
 * `attachments` is optional — populated by the API from HR's uploaded files.
 * `newSupervisorId` is required when the offboardee has direct reports.
 * `newTeamLeaderId` is required when the offboardee leads teams.
 */
export interface InitiateOffboardingRequestDto {
  employeeId: string;
  tenderDate: string;
  effectiveDate: string;
  clearanceTemplateId?: string;
  attachments?: OffboardingAttachmentInput[];
  newSupervisorId?: string;
  newTeamLeaderId?: string;
}
