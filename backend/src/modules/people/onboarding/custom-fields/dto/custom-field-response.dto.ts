import type { ApiSuccessResponseDto } from "../../../../../core/dto";

/**
 * Single onboarding custom field returned by the API.
 */
export interface CustomFieldDto {
  id: string;
  fieldLabel: string;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Response for GET /api/v1/onboarding/custom-fields/:id and mutation endpoints. */
export type CustomFieldResponseDto = ApiSuccessResponseDto<CustomFieldDto>;
