/**
 * Request body for POST /api/v1/employee-onboarding/documents/:documentId/submit.
 */
export interface SubmitDocumentRequestDto {
  /** URL of the uploaded file (e.g. from cloud storage). */
  fileUrl: string;
}
