/**
 * Case-insensitive multi-term search match. Splits `query` on whitespace and returns true only
 * when EVERY term appears somewhere in `haystack`. This enables full-name search across
 * concatenated fields — e.g. "jane smith" matches a haystack of "Jane Marie Smith jane@acme.com"
 * even though no single field contains the whole string. An empty query matches everything.
 */
export function matchesSearchTerms(query: string, haystack: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = haystack.toLowerCase();
  return terms.every((term) => hay.includes(term));
}
