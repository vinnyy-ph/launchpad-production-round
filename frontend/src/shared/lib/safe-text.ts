import { z } from "zod";

/**
 * Mirrors the backend `assertSafeText` rules (see backend
 * core/validation/text-input.ts). Free-text is rejected — not stripped — when it
 * looks like HTML or contains disallowed control characters, so what the user
 * types is never silently altered. This is a defense-in-depth guard at the form
 * boundary; the backend enforces the same rules authoritatively.
 */

// `<` followed by a letter, `/`, or `!` — an opening/closing tag or comment.
// Deliberately allows `a < b`, `5 > 3`, `<3`.
const TAG_LIKE = /<[a-zA-Z!/]/;

// ASCII control chars except tab (\t), newline (\n) and carriage return (\r).
const DISALLOWED_CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

/** True if the value looks like it contains HTML or disallowed control characters. */
export function containsUnsafeText(value: string): boolean {
  return TAG_LIKE.test(value) || DISALLOWED_CONTROL.test(value);
}

/**
 * A zod string schema with a length cap and the no-HTML/no-control-char rule.
 * Empty strings pass — compose `.min(1)` separately where a value is required.
 */
export function safeText(label: string, maxLen: number) {
  return z
    .string()
    .max(maxLen, `${label} must be ${maxLen} characters or fewer.`)
    .refine(
      (v) => !containsUnsafeText(v),
      `${label} must not contain HTML or special characters.`,
    );
}
