/**
 * Field-level or rule-level error detail returned by API error responses.
 * Use `field` for validation errors tied to a specific request property.
 */
export class ApiErrorDetailDto {
  field?: string;
  message!: string;
  code?: string;
}
