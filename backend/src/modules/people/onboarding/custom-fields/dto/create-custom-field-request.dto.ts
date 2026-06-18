/**
 * Request body for POST /api/v1/onboarding/custom-fields.
 */
export interface CreateCustomFieldRequestDto {
  /** Label shown to the employee during onboarding. */
  fieldLabel: string;
  /** Whether the employee must fill in this field. Defaults to false. */
  isRequired?: boolean;
}
