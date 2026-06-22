import { formatPeriod } from "@/screens/supervisor/evaluations.format";

// Noon-local ISO (no trailing Z) so the rendered calendar date is timezone-stable.
const pad = (n: number) => String(n).padStart(2, "0");
const local = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}T12:00:00`;

const CURRENT_YEAR = new Date().getFullYear();
const PAST_YEAR = 2020;

describe("formatPeriod", () => {
  it("collapses the repeated month for a same-month range", () => {
    expect(formatPeriod(local(CURRENT_YEAR, 6, 1), local(CURRENT_YEAR, 6, 25))).toBe("Jun 1 - 25");
  });

  it("keeps both months for a cross-month range", () => {
    expect(formatPeriod(local(CURRENT_YEAR, 1, 1), local(CURRENT_YEAR, 3, 31))).toBe("Jan 1 - Mar 31");
  });

  it("drops the year only for the current year", () => {
    expect(formatPeriod(local(PAST_YEAR, 6, 1), local(PAST_YEAR, 6, 25))).toBe("Jun 1 - 25, 2020");
    expect(formatPeriod(local(PAST_YEAR, 1, 1), local(PAST_YEAR, 3, 31))).toBe("Jan 1 - Mar 31, 2020");
  });

  it("carries the year on both ends when the period spans two years", () => {
    expect(formatPeriod(local(2025, 12, 1), local(2026, 1, 31))).toBe("Dec 1, 2025 - Jan 31, 2026");
  });

  it("returns an em dash for invalid input", () => {
    expect(formatPeriod("not-a-date", local(CURRENT_YEAR, 6, 25))).toBe("—");
  });
});
