/**
 * Request body for replacing a team's members.
 * The service always keeps the team leader in the final membership set.
 */
export interface UpdateTeamMembersRequestDto {
  memberIds: string[];
}
