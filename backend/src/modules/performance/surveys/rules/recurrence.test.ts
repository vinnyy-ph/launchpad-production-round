import { nextRelease, scheduleOffsetMs, deadlineFor, validateSchedule } from "./recurrence";

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
