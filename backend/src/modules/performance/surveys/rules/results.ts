/** Anonymous surveys never reveal a breakdown computed from fewer than this many responses. */
export const MIN_GROUP = 3;

export type Gated<T> = { suppressed: true } | { suppressed: false; data: T };

/**
 * Minimum-group-size suppression. Runs AFTER the scope-visibility predicate has already
 * narrowed what this viewer may see — `gate()` is ONLY the small-group firewall, never the
 * access-control chokepoint. Non-anonymous surveys are never suppressed.
 */
export function gate<T>(group: { count: number; data: T }, isAnonymous: boolean): Gated<T> {
  if (isAnonymous && group.count < MIN_GROUP) return { suppressed: true };
  return { suppressed: false, data: group.data };
}

/** Apply `gate()` to every group of a breakdown independently. */
export function suppressSmallGroups<T>(
  groups: Array<{ key: string; count: number; data: T }>,
  isAnonymous: boolean,
): Array<{ key: string } & Gated<T>> {
  return groups.map((group) => {
    const result = gate({ count: group.count, data: group.data }, isAnonymous);
    return result.suppressed
      ? { key: group.key, suppressed: true as const }
      : { key: group.key, suppressed: false as const, data: result.data };
  });
}
