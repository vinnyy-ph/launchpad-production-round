import type { ComboboxOption } from "@/shared/ui";
import type { EmployeeListItem } from "./types/employees.types";

/** Two-letter initials from a full name, used as the avatar fallback. */
export function employeeInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Shared brand-gradient background for employee avatar fallbacks (initials). */
export const EMPLOYEE_AVATAR_FALLBACK_STYLE = {
  background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
} as const;

/**
 * Maps a directory employee to a Combobox option for employee pickers: a leading avatar, the
 * full name as the label, and the job title as the secondary (gray) sublabel. Keeps every
 * employee selector across the app visually consistent.
 */
export function toEmployeeOption(employee: EmployeeListItem): ComboboxOption {
  return {
    value: employee.id,
    label: employee.fullName,
    sublabel: employee.jobTitle ?? undefined,
    avatarUrl: employee.avatarUrl,
    avatarFallback: employeeInitials(employee.fullName),
  };
}
