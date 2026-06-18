/**
 * Request body for creating a team.
 */
export interface CreateTeamRequestDto {
  name: string;
  leaderId: string;
  memberIds: string[];
}
