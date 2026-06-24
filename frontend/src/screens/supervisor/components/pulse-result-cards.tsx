"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw, BarChart3, ChevronRight, Lock } from "lucide-react";
import { Badge } from "@/shared/ui";
import { EmptyState } from "@/shared/ui/patterns";
import { useEnrichedPulseResults } from "@/modules/performance/surveys/hooks/use-enriched-pulse-results";
import type { PulseCardModel } from "@/screens/supervisor/pulse-results.logic";

function ParticipationBar({ pct }: { pct: number }) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--bg-tertiary)]">
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: "hsl(var(--chart-1))" }}
      />
    </div>
  );
}

function PulseCard({ card }: { card: PulseCardModel }) {
  return (
    <Link
      href={`/surveys/${card.id}/results`}
      className="group block rounded-xl border border-[color:var(--border-primary)] bg-white p-5 transition-colors hover:border-[color:var(--border-secondary)]"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{card.name}</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">{card.statusLabel}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Badge variant={card.isAnonymous ? "brand" : "modern"} size="sm" pill>
            {card.isAnonymous ? "Anonymous" : "Named"}
          </Badge>
          <ChevronRight size={16} className="text-[color:var(--text-quaternary)] transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {card.forbidden ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-[color:var(--color-warning-50)] p-3 text-[color:var(--color-warning-600)]">
          <Lock size={14} className="mt-0.5 flex-none" />
          <p className="text-xs font-medium">
            Results hidden — this team has fewer than 3 members, so its anonymous results aren&apos;t shown to its supervisor.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {card.participation ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-[color:var(--text-tertiary)]">Participation</span>
                <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">
                  {card.participation.pct}% · {card.participation.responded} of {card.participation.recipient}
                </span>
              </div>
              <ParticipationBar pct={card.participation.pct} />
            </div>
          ) : (
            <p className="text-xs text-[color:var(--text-tertiary)]">No responses yet.</p>
          )}

          {card.sentiment ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-[color:var(--text-tertiary)]">Avg sentiment</span>
              <span className="text-sm font-bold tabular-nums text-[color:var(--text-primary)]">
                {card.sentiment.avg.toFixed(1)}
              </span>
              <span className="text-xs text-[color:var(--text-tertiary)]">/ {card.sentiment.scaleMax}</span>
            </div>
          ) : card.suppressed ? (
            <p className="text-xs text-[color:var(--text-tertiary)]">Breakdown hidden until at least 3 people respond.</p>
          ) : null}
        </div>
      )}
    </Link>
  );
}

/** The supervisor Overview pulse-results section: discovery list enriched with participation + sentiment. */
export function PulseResultCards() {
  const { cards, isLoading, isError, refetch } = useEnrichedPulseResults();

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
        Pulse results{cards.length > 0 ? ` (${cards.length})` : ""}
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-[150px] rounded-xl border border-[color:var(--border-primary)] bg-white"
              style={{ boxShadow: "var(--shadow-xs)" }}
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">Could not load results.</span>
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No results to view yet"
          body="Pulse-survey results you're allowed to see will appear here once a survey has responses."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <PulseCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}
