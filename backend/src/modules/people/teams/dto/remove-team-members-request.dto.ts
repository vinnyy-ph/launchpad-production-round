/**
 * Request body for removing one or more employees from an existing team.
 * The service rejects requests that include the team leader.
 */
export interface RemoveTeamMembersRequestDto {
  memberIds: string[];
}
