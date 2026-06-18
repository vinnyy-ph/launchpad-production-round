import type { ApiSuccessResponseDto } from "../../../../../core/dto";

/** Public invitation lifecycle status returned by the API. */
export type InvitationStatusDto =
  | "pending"
  | "accepted"
  | "expired"
  | "failed_delivery";

/**
 * Invitation summary returned by send, resend, and update-email endpoints.
 */
export interface InvitationDto {
  id: string;
  recordId: string;
  sentToEmail: string;
  status: InvitationStatusDto;
  sentAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Success envelope for a single invitation action. */
export type InvitationResponseDto = ApiSuccessResponseDto<InvitationDto>;

/** Success envelope for listing invitations on an onboarding record. */
export type InvitationListResponseDto = ApiSuccessResponseDto<InvitationDto[]>;
