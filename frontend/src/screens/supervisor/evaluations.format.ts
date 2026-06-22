import { format } from "date-fns";

/**
 * A period interval, hyphen-separated. Collapses the month when both ends share it
 * ("Jun 1 - 25") and drops the year when the whole period falls in the current year.
 * Cross-year periods carry the year on both ends ("Dec 1, 2025 - Jan 31, 2026").
 */
export function formatPeriod(startIso: string, endIso: string): string {
  const from = new Date(startIso);
  const to = new Date(endIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "—";

  // Years differ: each end carries its own year.
  if (from.getFullYear() !== to.getFullYear()) {
    return `${format(from, "LLL d, yyyy")} - ${format(to, "LLL d, yyyy")}`;
  }

  // Same year — show the year once at the end, dropped entirely when it's the current year.
  const yearTail = from.getFullYear() === new Date().getFullYear() ? "" : `, ${from.getFullYear()}`;

  // Same month too: collapse the repeated month — "Jun 1 - 25".
  if (from.getMonth() === to.getMonth()) {
    return `${format(from, "LLL d")} - ${format(to, "d")}${yearTail}`;
  }
  // Cross-month, same year — "Jan 1 - Mar 31".
  return `${format(from, "LLL d")} - ${format(to, "LLL d")}${yearTail}`;
}
