import { PaginatedApiResponseDto } from "../../../../core/dto";
import type { SurveyListItemDto } from "./survey-list-item.dto";

export class ListSurveysResponseDto extends PaginatedApiResponseDto<SurveyListItemDto> {}
