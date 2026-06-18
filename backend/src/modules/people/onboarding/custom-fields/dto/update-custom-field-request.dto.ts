/**
 * Request body for PUT /api/v1/onboarding/custom-fields/:id.
 */
export interface UpdateCustomFieldRequestDto {
  /** Label shown to the employee during onboarding. */
  fieldLabel: string;
  /** Whether the employee must fill in this field. Defaults to false. */
  isRequired?: boolean;
}
