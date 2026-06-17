import { PaginatedApiResponseDto } from "../../../../core/dto";
import type { EvaluationResponseDto } from "./evaluation-response.dto";

export class ListEvaluationsResponseDto extends PaginatedApiResponseDto<EvaluationResponseDto> {}
