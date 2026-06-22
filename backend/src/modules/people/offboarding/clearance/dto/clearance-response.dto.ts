import type { ApiSuccessResponseDto } from "../../../../../core/dto";

/** Clearance template option HR can choose while starting offboarding. */
export interface ClearanceTemplateOptionDto {
  id: string;
  name: string;
  isDefault: boolean;
  signatoryCount: number;
}

/** One clearance request assigned to the caller, with offboardee + record context. */
export interface AssignedClearanceDto {
  requestId: string;
  offboardingId: string;
  /** Snapshot copied from the template signatory at initiation. */
  purpose: string;
  requirements: string;
  status: "PENDING" | "SIGNED" | "REJECTED";
  note: string | null;
  actionAt: string | null;
  offboardee: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    department: string | null;
  };
  effectiveDate: string;
  recordStatus: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

/** A single clearance request after a sign/reject/reset action. */
export interface ClearanceActionDataDto {
  requestId: string;
  offboardingId: string;
  status: "PENDING" | "SIGNED" | "REJECTED";
  note: string | null;
  actionAt: string | null;
  /** Set when the action completed the offboarding (all requests SIGNED). */
  offboardingCompleted: boolean;
  /** Set when completion also flipped the employee to INACTIVE. */
  employeeInactivated: boolean;
}

/** Response for GET /api/v1/clearance/assigned. */
export type AssignedClearancesResponseDto = ApiSuccessResponseDto<
  AssignedClearanceDto[]
>;

/** Response for GET /api/v1/clearance/templates. */
export type ClearanceTemplatesResponseDto = ApiSuccessResponseDto<
  ClearanceTemplateOptionDto[]
>;

/** Response for the sign / reject / reset endpoints. */
export type ClearanceActionResponseDto =
  ApiSuccessResponseDto<ClearanceActionDataDto>;
