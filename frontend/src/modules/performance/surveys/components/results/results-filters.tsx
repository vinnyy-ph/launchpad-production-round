"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import { useAudienceOptions } from "../../hooks/use-audience-options";
import type { ResultsFilter } from "../../types/surveys.types";

const ALL = "__all__";

/**
 * Team / supervisor scope filter for results. The two are mutually exclusive (the server
 * rejects both at once) — selecting one replaces the whole filter, clearing the other.
 */
export function ResultsFilters({
  filter,
  onChange,
}: {
  filter: ResultsFilter;
  onChange: (filter: ResultsFilter) => void;
}) {
  const { data } = useAudienceOptions();
  const teams = data?.teams ?? [];
  const supervisors = data?.supervisors ?? [];

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Team</span>
        <Select
          value={filter.teamId ?? ALL}
          onValueChange={(v) => onChange(v === ALL ? {} : { teamId: v })}
        >
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Supervisor</span>
        <Select
          value={filter.supervisorId ?? ALL}
          onValueChange={(v) => onChange(v === ALL ? {} : { supervisorId: v })}
        >
          <SelectTrigger className="h-9 w-56">
            <SelectValue placeholder="All supervisors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All supervisors</SelectItem>
            {supervisors.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(filter.teamId || filter.supervisorId) && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="text-xs font-medium text-[color:var(--text-secondary)] underline underline-offset-2 hover:text-[color:var(--text-primary)]"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}
