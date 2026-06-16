/**
 * Standard success envelope for API responses.
 * Use this when an endpoint should return a consistent success flag, optional message, and data payload.
 */
export class ApiSuccessResponseDto<TData> {
  success!: true;
  message?: string;
  data!: TData;
}
