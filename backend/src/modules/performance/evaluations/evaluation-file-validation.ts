import { EVAL_UPLOAD_ERROR_MESSAGES } from "./evaluations.constants";

/** MIME types permitted for evaluation supporting document uploads (multer first gate). */
export const EVALUATION_UPLOAD_MIME_TYPES = ["application/pdf"] as const;

/** Coarse MIME allowlist used by multer before the magic-byte check in the controller. */
export function isAllowedEvaluationMimeType(mimetype: string): boolean {
  const normalized = mimetype.toLowerCase().split(";")[0]?.trim() ?? "";

  return EVALUATION_UPLOAD_MIME_TYPES.includes(
    normalized as (typeof EVALUATION_UPLOAD_MIME_TYPES)[number],
  );
}

function matchesPdfMagicBytes(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
}

/**
 * Validates extension, declared MIME type, and file content (magic bytes)
 * for an evaluation supporting document. Only PDFs are permitted.
 */
export function validateEvaluationUploadFile(
  file: Pick<Express.Multer.File, "originalname" | "mimetype" | "buffer">,
): void {
  const extension = extractExtension(file.originalname);

  if (extension !== "pdf") {
    throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE);
  }

  const normalizedMime = file.mimetype.toLowerCase().split(";")[0]?.trim() ?? "";

  if (normalizedMime !== "application/pdf") {
    throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE);
  }

  if (!file.buffer?.length || !matchesPdfMagicBytes(file.buffer)) {
    throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE);
  }
}

function extractExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");

  if (dot < 0) {
    return null;
  }

  const extension = filename.slice(dot + 1).toLowerCase();

  return extension.length > 0 ? extension : null;
}
