/** Cadences from the RecurringType enum. */
export type Cadence =
  | "ONE_TIME"
  | "WEEKLY"
  | "BI_WEEKLY"
  | "MONTHLY"
  | "BI_MONTHLY"
  | "QUARTERLY"
  | "SEMI_ANNUAL"
  | "ANNUAL";

/**
 * The release date of the next occurrence, or `null` for ONE_TIME (the scheduler must skip
 * ONE_TIME after its single occurrence). UTC math keeps results timezone-independent.
 */
export function nextRelease(from: Date, cadence: Cadence): Date | null {
  const d = new Date(from.getTime());
  switch (cadence) {
    case "ONE_TIME":
      return null;
    case "WEEKLY":
      d.setUTCDate(d.getUTCDate() + 7);
      return d;
    case "BI_WEEKLY":
      d.setUTCDate(d.getUTCDate() + 14);
      return d;
    case "MONTHLY":
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d;
    case "BI_MONTHLY":
      d.setUTCMonth(d.getUTCMonth() + 2);
      return d;
    case "QUARTERLY":
      d.setUTCMonth(d.getUTCMonth() + 3);
      return d;
    case "SEMI_ANNUAL":
      d.setUTCMonth(d.getUTCMonth() + 6);
      return d;
    case "ANNUAL":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      return d;
    default: {
      const _exhaustive: never = cadence;
      return _exhaustive;
    }
  }
}

/** Milliseconds between the first release and first deadline — the canonical window reused by every occurrence. */
export function scheduleOffsetMs(releaseDate: Date, firstDeadline: Date): number {
  return firstDeadline.getTime() - releaseDate.getTime();
}

/** A later occurrence's deadline = its release + the canonical first offset. */
export function deadlineFor(release: Date, offsetMs: number): Date {
  return new Date(release.getTime() + offsetMs);
}

/** Reject a survey whose first deadline is not strictly after its release date. */
export function validateSchedule(releaseDate: Date, firstDeadline: Date): void {
  if (firstDeadline.getTime() <= releaseDate.getTime()) {
    throw new Error("firstDeadline must be strictly after releaseDate");
  }
}

export interface OccurrencePlan {
  occurrenceNumber: number;
  releaseDate: Date;
  deadline: Date;
}

/**
 * The occurrences that should now exist for a recurring survey, given its latest occurrence
 * and the current time. Walks the cadence forward, emitting one plan per release whose time
 * has arrived (release <= now), each keeping the canonical release->deadline `offsetMs`.
 * Returns [] when nothing is due (the current occurrence is still open, or ONE_TIME). `cap`
 * bounds catch-up after a long gap so a stale survey can't spin forever.
 */
export function planCatchUpOccurrences(
  latest: { occurrenceNumber: number; releaseDate: Date },
  cadence: Cadence,
  offsetMs: number,
  now: Date,
  cap = 60,
): OccurrencePlan[] {
  const plans: OccurrencePlan[] = [];
  let release = latest.releaseDate;
  let occurrenceNumber = latest.occurrenceNumber;

  for (let i = 0; i < cap; i++) {
    const release_ = nextRelease(release, cadence);
    if (!release_) break; // ONE_TIME — no further occurrence
    if (release_.getTime() > now.getTime()) break; // next release not yet due
    occurrenceNumber += 1;
    plans.push({
      occurrenceNumber,
      releaseDate: release_,
      deadline: deadlineFor(release_, offsetMs),
    });
    release = release_;
  }

  return plans;
}
