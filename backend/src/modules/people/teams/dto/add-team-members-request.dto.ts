/**
 * Request body for adding one or more employees to an existing team.
 * Existing memberships are ignored so clients can safely retry the request.
 */
export interface AddTeamMembersRequestDto {
  memberIds: string[];
}
