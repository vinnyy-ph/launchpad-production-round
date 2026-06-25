import { EVAL_UPLOAD_ERROR_MESSAGES } from "./evaluations.constants";

/** A supporting document attached to an evaluation: an uploaded file or a pasted link. */
export type SupportingDoc =
  | { kind: "file"; url: string; label: string }
  | { kind: "link"; url: string; label: string };

/**
 * Validates and normalizes a user-supplied supporting link. Only well-formed https URLs
 * are accepted — this also blocks javascript:/data:/file: schemes and malformed input.
 * The link's display label defaults to the URL hostname when none is provided.
 * Throws Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL) on any invalid input.
 */
export function validateSupportingLink(rawUrl: string, rawLabel?: string): SupportingDoc {
  const trimmed = (rawUrl ?? "").trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL);
  }

  const label = rawLabel?.trim() || parsed.hostname;

  return { kind: "link", url: parsed.toString(), label };
}
