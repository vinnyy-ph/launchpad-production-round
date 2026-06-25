/**
 * Public document submission status values returned by the document review API.
 * Prisma stores these as uppercase enum values, but the API returns lowercase values.
 */
export type DocumentReviewStatusDto = "pending" | "approved" | "rejected";
