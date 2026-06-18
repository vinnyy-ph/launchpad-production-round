import type { AudienceType } from "@prisma/client";

/** A supervisor the HR user can anchor a SUPERVISOR_BASED audience on. Minimal projection — no PII beyond display name + title. */
export interface AudienceSupervisorOptionDto {
  id: string;
  name: string;
  jobTitle: string | null;
}

/** A team the HR user can target with a SPECIFIC_TEAMS audience. */
export interface AudienceTeamOptionDto {
  id: string;
  name: string;
}

/** GET /pulse/surveys/audience/options response payload. */
export interface AudienceOptionsResponseDto {
  supervisors: AudienceSupervisorOptionDto[];
  teams: AudienceTeamOptionDto[];
}

/** POST /pulse/surveys/audience/preview request body (parsed/validated). */
export interface AudiencePreviewInput {
  audienceType: AudienceType;
  audienceConfigs: { supervisorId?: string; teamId?: string }[];
}

/** A resolved audience member returned in a preview (minimal projection). */
export interface AudiencePreviewMemberDto {
  id: string;
  name: string;
}

/**
 * POST /pulse/surveys/audience/preview response payload. `count` is the authoritative
 * total resolved audience size; `members` is a capped sample for display.
 */
export interface AudiencePreviewResponseDto {
  count: number;
  members: AudiencePreviewMemberDto[];
}
