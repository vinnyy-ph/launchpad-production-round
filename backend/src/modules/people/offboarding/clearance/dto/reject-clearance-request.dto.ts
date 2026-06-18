/** Validated body for POST /api/v1/clearance/:requestId/reject. Note is required. */
export interface RejectClearanceRequestDto {
  note: string;
}

/** Validated body for POST /api/v1/clearance/:requestId/sign. Note is optional. */
export interface SignClearanceRequestDto {
  note?: string;
}
