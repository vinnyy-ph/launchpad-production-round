/**
 * The Evaluations page renders two scopes over the full set the API returns
 * (own drafts + every sent evaluation the user is entitled to see):
 *
 *  - `mine`: evaluations I issued — drafts and sent — keyed on reviewerId. This is the
 *    "View Reports" surface (everything I have issued before).
 *  - `team`: sent evaluations elsewhere in my reporting line that I can see but did not
 *    issue (e.g. issued by a downward supervisor about their own report). My own received
 *    evaluations (reviewee === me) are excluded — those live on the employee Performance
 *    page, not here.
 *
 * Before the current user's employeeId is known, everything falls under `mine` (preserving
 * the page's prior fallback of showing the unfiltered list).
 */
export function partitionEvaluationsByScope<T extends { reviewerId: string; revieweeId: string }>(
  evaluations: T[],
  myEmployeeId: string | undefined,
): { mine: T[]; team: T[] } {
  if (!myEmployeeId) return { mine: evaluations, team: [] };

  const mine: T[] = [];
  const team: T[] = [];
  for (const ev of evaluations) {
    if (ev.reviewerId === myEmployeeId) mine.push(ev);
    else if (ev.revieweeId !== myEmployeeId) team.push(ev);
  }
  return { mine, team };
}
