/**
 * Request body for POST /api/v1/onboarding/documents.
 */
export interface CreateDocumentRequestDto {
  /** Display name shown to the employee during onboarding. */
  documentName: string;
  /** Optional guidance or notes for the employee about what to upload. */
  instructions?: string;
  /** Comma-separated allowed extensions, e.g. "pdf,jpg,png". */
  allowedFileTypes: string;
  /** Whether the employee must upload this document. Defaults to true. */
  isRequired?: boolean;
}
