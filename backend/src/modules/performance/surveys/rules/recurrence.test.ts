import {
  nextRelease,
  scheduleOffsetMs,
  deadlineFor,
  validateSchedule,
  planCatchUpOccurrences,
} from "./recurrence";

const at = (iso: string) => new Date(iso);

describe("nextRelease", () => {
  it("returns null for ONE_TIME", () => {
    expect(nextRelease(at("2026-06-16T09:00:00Z"), "ONE_TIME")).toBeNull();
  });
  it("advances WEEKLY by 7 days", () => {
    expect(nextRelease(at("2026-06-16T09:00:00Z"), "WEEKLY")?.toISOString()).toBe("2026-06-23T09:00:00.000Z");
  });
  it("advances BI_WEEKLY by 14 days", () => {
    expect(nextRelease(at("2026-06-16T09:00:00Z"), "BI_WEEKLY")?.toISOString()).toBe("2026-06-30T09:00:00.000Z");
  });
  it("advances MONTHLY by one month", () => {
    expect(nextRelease(at("2026-06-16T09:00:00Z"), "MONTHLY")?.toISOString()).toBe("2026-07-16T09:00:00.000Z");
  });
  it("advances QUARTERLY by three months", () => {
    expect(nextRelease(at("2026-06-16T09:00:00Z"), "QUARTERLY")?.toISOString()).toBe("2026-09-16T09:00:00.000Z");
  });
  it("advances ANNUAL by one year", () => {
    expect(nextRelease(at("2026-06-16T09:00:00Z"), "ANNUAL")?.toISOString()).toBe("2027-06-16T09:00:00.000Z");
  });
});

describe("offset reuse across occurrences", () => {
  it("a later occurrence keeps the first release->deadline window", () => {
    const offset = scheduleOffsetMs(at("2026-06-16T09:00:00Z"), at("2026-06-19T09:00:00Z")); // 3-day window
    expect(deadlineFor(at("2026-06-23T09:00:00Z"), offset).toISOString()).toBe("2026-06-26T09:00:00.000Z");
  });
});

describe("planCatchUpOccurrences", () => {
  const WEEK_OFFSET = scheduleOffsetMs(at("2026-06-01T09:00:00Z"), at("2026-06-03T09:00:00Z")); // 2-day window

  it("returns nothing while the current occurrence is still open", () => {
    // latest released today; now is 1 day later — next weekly release (in 6 days) not yet due
    const plans = planCatchUpOccurrences(
      { occurrenceNumber: 1, releaseDate: at("2026-06-16T09:00:00Z") },
      "WEEKLY",
      WEEK_OFFSET,
      at("2026-06-17T09:00:00Z"),
    );
    expect(plans).toEqual([]);
  });

  it("returns nothing for a ONE_TIME survey", () => {
    const plans = planCatchUpOccurrences(
      { occurrenceNumber: 1, releaseDate: at("2026-06-16T09:00:00Z") },
      "ONE_TIME",
      WEEK_OFFSET,
      at("2026-08-16T09:00:00Z"),
    );
    expect(plans).toEqual([]);
  });

  it("materializes the next occurrence once its release has arrived", () => {
    const plans = planCatchUpOccurrences(
      { occurrenceNumber: 1, releaseDate: at("2026-06-16T09:00:00Z") },
      "WEEKLY",
      WEEK_OFFSET,
      at("2026-06-24T09:00:00Z"), // past the 06-23 release
    );
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ occurrenceNumber: 2 });
    expect(plans[0].releaseDate.toISOString()).toBe("2026-06-23T09:00:00.000Z");
    expect(plans[0].deadline.toISOString()).toBe("2026-06-25T09:00:00.000Z"); // release + 2-day window
  });

  it("catches up multiple elapsed periods, numbering sequentially", () => {
    const plans = planCatchUpOccurrences(
      { occurrenceNumber: 1, releaseDate: at("2026-06-16T09:00:00Z") },
      "WEEKLY",
      WEEK_OFFSET,
      at("2026-07-10T09:00:00Z"), // ~3.4 weeks later → releases 06-23, 06-30, 07-07 are due
    );
    expect(plans.map((p) => p.occurrenceNumber)).toEqual([2, 3, 4]);
    expect(plans[plans.length - 1].releaseDate.toISOString()).toBe("2026-07-07T09:00:00.000Z");
  });
});

describe("validateSchedule", () => {
  it("throws when the deadline is not strictly after the release", () => {
    const d = at("2026-06-16T09:00:00Z");
    expect(() => validateSchedule(d, d)).toThrow();
    expect(() => validateSchedule(d, at("2026-06-15T09:00:00Z"))).toThrow();
  });
  it("passes when the deadline is after the release", () => {
    expect(() => validateSchedule(at("2026-06-16T09:00:00Z"), at("2026-06-17T09:00:00Z"))).not.toThrow();
  });
});
