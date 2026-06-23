/**
 * Shared validation for user-supplied free-text fields.
 *
 * We reject (rather than strip/sanitize) dangerous content so stored values are
 * never silently altered, then rely on context-aware escaping at each output.
 * This is a defense-in-depth measure at the API trust boundary: the same stored
 * text is later rendered in non-React contexts (HTML emails, AI prompts) that do
 * not benefit from React's automatic escaping.
 */

// Matches the start of an HTML tag/comment/closing tag — `<` followed by a
// letter, `/`, or `!`. Deliberately allows `a < b`, `5 > 3`, `<3`.
const TAG_LIKE = /<[a-zA-Z!/]/;

// ASCII control characters except tab (\t), newline (\n) and carriage return (\r).
const DISALLOWED_CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

/**
 * Throws if `value` exceeds `maxLen`, looks like it contains HTML, or contains
 * disallowed control characters. Error messages use stable suffixes so callers
 * (controllers) can map them to HTTP 400.
 */
export function assertSafeText(value: string, field: string, maxLen: number): void {
  if (value.length > maxLen) {
    throw new Error(`${field} must be ${maxLen} characters or fewer`);
  }
  if (TAG_LIKE.test(value) || DISALLOWED_CONTROL.test(value)) {
    throw new Error(`${field} must not contain HTML or control characters`);
  }
}
