import type { ClearanceTemplateSignatoryInputDto } from "./create-clearance-template-request.dto";

/**
 * Validated body for PUT /api/v1/clearance-templates/:id.
 * Edits the version name and its signatory list. The default flag is managed
 * separately (POST /:id/default) so the edit form never has to carry it.
 * Editing signatories does NOT affect in-flight clearances — those are snapshots
 * taken at offboarding initiation.
 */
export interface UpdateClearanceTemplateRequestDto {
  name: string;
  signatories: ClearanceTemplateSignatoryInputDto[];
}
