import { PaginatedApiResponseDto } from "../../../../core/dto";
import type { TeamDto } from "./team-response.dto";

/**
 * Response returned by GET /api/v1/teams.
 */
export class ListTeamsResponseDto extends PaginatedApiResponseDto<TeamDto> {}
