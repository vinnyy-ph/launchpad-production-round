import type { ApiSuccessResponseDto } from "../../../../../core/dto";
import type { CustomFieldDto } from "./custom-field-response.dto";

/** Response for GET /api/v1/onboarding/custom-fields. */
export type ListCustomFieldsResponseDto = ApiSuccessResponseDto<CustomFieldDto[]>;
