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

  // Defense-in-depth against HTML/script-injection payloads smuggled in the URL (e.g. an
  // encoded `<img onerror=...>` in the query). A legitimate document URL never needs angle
  // brackets, raw or percent-encoded at any depth, so reject any link that contains them.
  if (containsAngleBrackets(parsed.href) || containsAngleBrackets(trimmed)) {
    throw new Error(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL);
  }

  const label = rawLabel?.trim() || parsed.hostname;

  return { kind: "link", url: parsed.toString(), label };
}

/** True if the value contains `<` or `>` at any percent-encoding depth. */
function containsAngleBrackets(value: string): boolean {
  let current = value;
  for (let depth = 0; depth < 3; depth++) {
    if (/[<>]/.test(current)) return true;
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      // Malformed encoding: fall back to detecting the encoded forms directly.
      return /%3c|%3e/i.test(current);
    }
    if (next === current) break;
    current = next;
  }
  return /[<>]/.test(current);
}
