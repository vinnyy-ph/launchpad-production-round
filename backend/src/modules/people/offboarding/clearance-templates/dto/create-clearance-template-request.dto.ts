/**
 * One signatory configured on a clearance version. `order` is derived from the
 * position in the request array, so the client only supplies who clears what.
 */
export interface ClearanceTemplateSignatoryInputDto {
  employeeId: string;
  /** What this signatory clears (long text). */
  purpose: string;
  /** What they must verify before signing (long text). */
  requirements: string;
}

/**
 * Validated body for POST /api/v1/clearance-templates.
 * `isDefault` makes this the version used when offboarding omits an explicit one;
 * setting it unsets the previous default. `signatories` must be non-empty.
 */
export interface CreateClearanceTemplateRequestDto {
  name: string;
  isDefault: boolean;
  signatories: ClearanceTemplateSignatoryInputDto[];
}
