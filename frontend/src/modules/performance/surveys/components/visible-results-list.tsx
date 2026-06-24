// frontend/src/modules/performance/surveys/components/visible-results-list.tsx
"use client";

import Link from "next/link";
import { AlertCircle, BarChart3, ChevronRight, RefreshCw } from "lucide-react";
import { Badge, Skeleton } from "@/shared/ui";
import { EmptyState } from "@/shared/ui/patterns";
import { STATUS_LABEL } from "../types/surveys.types";
import { useVisibleResultSurveys } from "../hooks/use-visible-result-surveys";

/** Discovery list of surveys whose results the signed-in user may view. Used by the
 *  supervisor Overview and the employee Performance "Results" tab. */
export function VisibleResultsList() {
  const { data, isLoading, isError, refetch } = useVisibleResultSurveys();

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[58px] rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
        <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
        <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
          Could not load results.
        </span>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const surveys = data ?? [];
  if (surveys.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No results to view yet"
        body="Pulse-survey results you're allowed to see will appear here once a survey has responses."
      />
    );
  }

  return (
    <div
      className="divide-y divide-[color:var(--border-secondary)] overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      {surveys.map((s) => (
        <Link
          key={s.id}
          href={`/surveys/${s.id}/results`}
          className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[color:var(--bg-secondary)]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{s.name}</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">{STATUS_LABEL[s.status]}</p>
          </div>
          <div className="flex flex-none items-center gap-2.5">
            <Badge variant={s.isAnonymous ? "brand" : "modern"} size="sm" pill>
              {s.isAnonymous ? "Anonymous" : "Named"}
            </Badge>
            <ChevronRight size={16} className="text-[color:var(--text-quaternary)]" />
          </div>
        </Link>
      ))}
    </div>
  );
}
