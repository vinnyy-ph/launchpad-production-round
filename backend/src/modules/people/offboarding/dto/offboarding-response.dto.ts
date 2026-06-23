import type { ApiSuccessResponseDto } from "../../../../core/dto";

/** Minimal employee identity used across offboarding payloads. */
export interface OffboardingEmployeeSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: string | null;
}

/** One clearance signature request with its signatory and snapshot context. */
export interface SignatureRequestDto {
  id: string;
  signatory: {
    id: string;
    firstName: string;
    lastName: string;
  };
  /** Snapshot copied from the template signatory at initiation. */
  purpose: string;
  requirements: string;
  status: "PENDING" | "SIGNED" | "REJECTED";
  note: string | null;
  actionAt: string | null;
}

/** A single offboarding record as it appears in the list view. */
export interface OffboardingListItemDto {
  id: string;
  employee: OffboardingEmployeeSummaryDto;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  tenderDate: string;
  effectiveDate: string;
  attachmentUrl: string | null;
  signedCount: number;
  totalCount: number;
  createdAt: string;
  completedAt: string | null;
}

/** Full offboarding record with all signature requests, for the detail view. */
export interface OffboardingDetailDto {
  id: string;
  employee: OffboardingEmployeeSummaryDto;
  initiatedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  clearanceTemplateId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  tenderDate: string;
  effectiveDate: string;
  attachmentUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  signatureRequests: SignatureRequestDto[];
}

/** Response for POST /api/v1/offboarding and GET /api/v1/offboarding/:id. */
export type OffboardingDetailResponseDto =
  ApiSuccessResponseDto<OffboardingDetailDto>;

/** Response for GET /api/v1/offboarding. */
export type OffboardingListResponseDto = ApiSuccessResponseDto<
  OffboardingListItemDto[]
>;

/** Response for GET /api/v1/offboarding/me — null when the caller has no record. */
export type MyOffboardingResponseDto =
  ApiSuccessResponseDto<OffboardingDetailDto | null>;

/** Response for POST /api/v1/offboarding/:id/reassign. */
export type ReassignResponseDto = ApiSuccessResponseDto<{
  offboardingId: string;
  reassignedReports: number;
  reassignedTeams: number;
  newSupervisorId: string;
  newTeamLeaderId: string;
}>;
