/**
 * Request body for PATCH /api/v1/onboarding/document-reviews/:submissionId/reject.
 * HR must provide a note explaining why the document was rejected.
 */
export interface RejectDocumentRequestDto {
  rejectionNote: string;
}
