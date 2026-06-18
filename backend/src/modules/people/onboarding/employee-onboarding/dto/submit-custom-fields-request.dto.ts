/** One custom field answer submitted by the employee. */
export interface CustomFieldValueInputDto {
  fieldId: string;
  value: string;
}

/**
 * Request body for POST /api/v1/employee-onboarding/custom-fields.
 */
export interface SubmitCustomFieldsRequestDto {
  fields: CustomFieldValueInputDto[];
}
