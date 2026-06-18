/**
 * Route parameters for endpoints that target one employee membership inside a team.
 */
export interface TeamMemberParamsDto {
  teamId: string;
  employeeId: string;
}
