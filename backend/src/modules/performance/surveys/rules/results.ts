/** Anonymous surveys never reveal a breakdown computed from fewer than this many responses. */
export const MIN_GROUP = 3;

/**
 * On anonymous surveys, a team-scoped result view is hidden from that team's own supervisor
 * when the team has fewer than this many members — HR and the managers above that supervisor
 * can still see it. Distinct from MIN_GROUP: this counts team membership, not responses.
 */
export const MIN_TEAM_SIZE = 3;

/** HR may send a small team's supervisor a note only within this many days of the survey closing. */
export const SHARE_WINDOW_DAYS = 30;

/** End of HR's send window for an occurrence: its close (deadline) plus SHARE_WINDOW_DAYS. */
export function shareWindowEnd(closeDate: Date | string): Date {
  return new Date(new Date(closeDate).getTime() + SHARE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

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
