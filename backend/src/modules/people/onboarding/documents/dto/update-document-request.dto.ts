/**
 * Request body for PUT /api/v1/onboarding/documents/:id.
 */
export interface UpdateDocumentRequestDto {
  documentName: string;
  instructions?: string;
  allowedFileTypes: string;
  isRequired?: boolean;
}
