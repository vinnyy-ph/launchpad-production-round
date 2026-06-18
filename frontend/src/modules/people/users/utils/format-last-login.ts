import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";

/** Formats last login as Today / Yesterday / Tomorrow, otherwise (Mon, Jun 18, 2026). */
export function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return "Never";

  const date = parseISO(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isTomorrow(date)) return "Tomorrow";

  return `(${format(date, "EEE, MMM d, yyyy")})`;
}
