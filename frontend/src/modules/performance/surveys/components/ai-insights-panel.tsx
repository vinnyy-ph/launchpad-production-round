"use client";

import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";
import { useSurveyInsights } from "../hooks/use-survey-insights";
import type { InsightSentiment } from "../types/surveys.types";

const SENTIMENT_VARIANT: Record<InsightSentiment, "success" | "warning" | "error" | "neutral"> = {
  positive: "success",
  mixed: "warning",
  negative: "error",
  neutral: "neutral",
};
const SENTIMENT_LABEL: Record<InsightSentiment, string> = {
  positive: "Positive",
  mixed: "Mixed",
  negative: "Negative",
  neutral: "Neutral",
};

const CARD =
  "rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 shadow-[0_1px_3px_-1px_rgba(16,18,24,0.07),0_7px_16px_-6px_rgba(16,18,24,0.11)] sm:p-6";

export function AiInsightsPanel({
  surveyId,
  hasOpenText,
  isAnonymous,
}: {
  surveyId: string;
  hasOpenText: boolean;
  isAnonymous: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const q = useSurveyInsights(surveyId, { enabled });
  const data = q.data;

  if (!hasOpenText) return null;

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await q.regenerate();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className={cn(CARD, "mb-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[color:var(--brand-blue)]" />
          <h2 className="text-[16px] font-bold tracking-tight text-[color:var(--text-primary)]">
            AI insights
          </h2>
        </div>
        {data?.insight && (
          <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={regenerating}>
            <RefreshCw size={14} className={cn(regenerating && "animate-spin")} />
            Regenerate
          </Button>
        )}
      </div>

      {/* Initial CTA */}
      {!enabled && (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p className="text-[14px] text-[color:var(--text-tertiary)]">
            Summarize the written responses into key themes, overall sentiment
            {isAnonymous ? "" : ", and notable quotes"}.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setEnabled(true)}>
            <Sparkles size={15} className="text-[color:var(--brand-blue)]" />
            Generate AI summary
          </Button>
        </div>
      )}

      {/* Loading */}
      {enabled && (q.isLoading || regenerating) && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      )}

      {/* Error */}
      {enabled && q.isError && !regenerating && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
            Couldn&apos;t generate the summary.
          </span>
          <button
            onClick={() => void q.refetch()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Unavailable / suppressed */}
      {data && !data.insight && (
        <p className="mt-4 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-4 py-3 text-[14px] text-[color:var(--text-tertiary)]">
          {data.reason === "no_responses"
            ? "No written responses yet — the summary will appear once people answer."
            : data.suppressed
              ? "Not enough responses for an anonymous summary (at least 3 needed)."
              : "No open-text questions in this survey."}
        </p>
      )}

      {/* Success */}
      {data?.insight && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-[color:var(--gradient-jia,var(--bg-secondary))] p-4">
            <p className="text-[16px] font-semibold leading-snug text-[color:var(--text-primary)]">
              {data.insight.oneLiner}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
              Sentiment
            </span>
            <Badge variant={SENTIMENT_VARIANT[data.insight.sentiment.overall]} pill animateIn>
              {SENTIMENT_LABEL[data.insight.sentiment.overall]}
            </Badge>
            <span className="text-[14px] text-[color:var(--text-tertiary)]">
              {data.insight.sentiment.rationale}
            </span>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
              Key themes
            </div>
            <div className="space-y-2.5">
              {data.insight.themes.map((t, i) => (
                <div key={i} className="rounded-xl border border-[color:var(--border-primary)] px-4 py-3">
                  <div className="text-[14px] font-semibold text-[color:var(--text-primary)]">{t.label}</div>
                  <div className="mt-0.5 text-[14px] text-[color:var(--text-tertiary)]">{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          {data.insight.quotes.length > 0 && (
            <div>
              <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                Notable quotes
              </div>
              <div className="space-y-2.5">
                {data.insight.quotes.map((quote, i) => (
                  <blockquote
                    key={i}
                    className="border-l-2 border-[color:var(--brand-blue)] pl-3 text-[14px] italic text-[color:var(--text-secondary)]"
                  >
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                ))}
              </div>
            </div>
          )}
          {data.cached && (
            <p className="text-[12px] text-[color:var(--text-quaternary)]">
              Cached summary · regenerate for the latest responses.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
