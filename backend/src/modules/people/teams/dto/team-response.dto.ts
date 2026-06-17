import type { TeamEmployeeResponseDto } from "./team-employee-response.dto";

/**
 * Team payload returned to clients.
 * The leader is also included in members because leaders participate in their teams.
 */
export interface TeamDto {
  id: string;
  name: string;
  leader: TeamEmployeeResponseDto;
  members: TeamEmployeeResponseDto[];
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Success envelope for one team.
 */
export interface TeamResponseDto {
  success: true;
  message?: string;
  data: TeamDto;
}
