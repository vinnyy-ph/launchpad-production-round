import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Button } from "@/shared/ui/primitives/button";
import type { ActivityLogEntry } from "../services/employees.service";

/** Number of most recent entries shown before the user expands the full history. */
const DEFAULT_VISIBLE_COUNT = 5;

/** Human-readable labels for the audited profile fields (keyed by the stored field name). */
const FIELD_LABELS: Record<string, string> = {
  firstName: "First Name",
  middleName: "Middle Name",
  lastName: "Last Name",
  personalEmail: "Personal Email",
  companyEmail: "Company Email",
  birthday: "Birthday",
  jobTitle: "Job Title",
  department: "Department",
  status: "Employment Status",
  supervisor: "Supervisor",
  "address.country": "Country",
  "address.province": "Province",
  "address.city": "City",
  "address.address": "Address",
  "emergencyContact.name": "Emergency Contact Name",
  "emergencyContact.phone": "Emergency Contact Phone",
};

function formatFieldName(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName;
}

/**
 * Formats a change timestamp relative to today, e.g. "Today at 11:43 AM",
 * "Yesterday at 11:43 AM", or "Jun 24, 2026 at 11:43 AM" for older entries.
 */
function formatActivityDate(timestamp: string): string {
  const date = new Date(timestamp);
  const time = format(date, "h:mm a");
  if (isToday(date)) return `Today at ${time}`;
  if (isYesterday(date)) return `Yesterday at ${time}`;
  return `${format(date, "MMM d, yyyy")} at ${time}`;
}

interface ProfileActivityHistoryProps {
  logs: ActivityLogEntry[];
  loading: boolean;
}

/**
 * Vertical timeline of profile field changes. Shared between the HR employee details modal and
 * the employee's own "My profile" page so both render an identical activity history.
 */
export function ProfileActivityHistory({ logs, loading }: ProfileActivityHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleLogs = showAll ? logs : logs.slice(0, DEFAULT_VISIBLE_COUNT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[color:var(--text-tertiary)]">Profile Field Changes</p>
        {logs.length > DEFAULT_VISIBLE_COUNT ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs font-semibold"
            onClick={() => setShowAll((current) => !current)}
          >
            {showAll ? "View less" : "View all"}
          </Button>
        ) : null}
      </div>
      {loading ? (
        <div className="space-y-6 pl-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-[color:var(--bg-secondary)]" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[color:var(--text-primary)]">No activity yet</p>
          <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
            Profile field edits will be tracked here.
          </p>
        </div>
      ) : (
        <div>
          {visibleLogs.map((log, index) => (
            <div key={log.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className="z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
                />
                {index < visibleLogs.length - 1 && (
                  <div
                    className="mt-1 w-0.5 flex-1"
                    style={{ background: "linear-gradient(180deg, var(--brand-pink), var(--brand-peach))" }}
                  />
                )}
              </div>
              <div className="pb-6 min-w-0">
                <p className="text-sm text-[color:var(--text-primary)]">
                  <span className="font-bold">{log.editorName}</span> changed the{" "}
                  {formatFieldName(log.fieldName)}{" "}
                  <span className="text-[color:var(--text-tertiary)]">
                    • {formatActivityDate(log.timestamp)}
                  </span>
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                  <span className="max-w-[160px] truncate">{log.oldValue ?? "—"}</span>
                  <span aria-hidden="true">→</span>
                  <span className="max-w-[160px] truncate font-medium text-[color:var(--text-primary)]">
                    {log.newValue ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
