import type { ApiErrorDetailDto } from "./api-error-detail.dto";

/**
 * Standard error envelope for API responses.
 * Use this shape for validation, authorization, not-found, and unexpected API failures.
 */
export class ApiErrorResponseDto {
  success!: false;
  message!: string;
  errorCode?: string;
  errors?: ApiErrorDetailDto[];
}
