"use client";

import { useState } from "react";
import { AlertCircle, BarChart3, EyeOff, RefreshCw } from "lucide-react";
import { EmptyState } from "@/shared/ui/patterns";
import { useSurveyResults } from "../hooks/use-survey-results";
import type { ResultsFilter } from "../types/surveys.types";
import { ResultsSummary } from "./results/results-summary";
import { ResultsFilters } from "./results/results-filters";
import { ResultsChart } from "./results/results-chart";

/** HR results dashboard for one survey: summary stats, scope filters, and per-question charts. */
export function SurveyResults({ surveyId }: { surveyId: string }) {
  const [filter, setFilter] = useState<ResultsFilter>({});
  const query = useSurveyResults(surveyId, filter);

  return (
    <div className="space-y-5">
      <ResultsFilters filter={filter} onChange={setFilter} />

      {query.isLoading && <ResultsSkeleton />}

      {query.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
            {query.error.message}
          </span>
          <button
            onClick={() => void query.refetch()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {query.data && (
        <>
          <ResultsSummary results={query.data} />

          {query.data.suppressed ? (
            <div className="pt-2">
              <EmptyState
                icon={EyeOff}
                title="Not enough responses to show results"
                body="This anonymous survey has fewer than 3 responses for the selected view, so no breakdown is shown."
              />
            </div>
          ) : query.data.totalResponses === 0 ? (
            <div className="pt-2">
              <EmptyState
                icon={BarChart3}
                title="No responses yet"
                body="Results will appear here once the audience starts answering."
              />
            </div>
          ) : (
            <div className="space-y-4">
              {query.data.questions.map((q) => (
                <div
                  key={q.questionId}
                  className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
                  style={{ boxShadow: "var(--shadow-xs)" }}
                >
                  <p className="mb-3 text-sm font-medium text-[color:var(--text-primary)]">
                    {q.questionText}
                  </p>
                  <ResultsChart result={q} isAnonymous={query.data.isAnonymous} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[88px] rounded-xl border border-[color:var(--border-primary)] bg-white"
          />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-48 rounded-xl border border-[color:var(--border-primary)] bg-white"
        />
      ))}
    </div>
  );
}
