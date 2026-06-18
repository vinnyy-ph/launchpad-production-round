/**
 * Route params for POST /api/v1/onboarding/invitations/:invitationId/resend
 * and PATCH /api/v1/onboarding/invitations/:invitationId/email.
 */
export interface ResendInvitationParamsDto {
  invitationId: string;
}
