"use client";

import { BarChart } from "@/shared/ui";
import type { QuestionResult } from "../../types/surveys.types";

/** Renders the aggregate for a single question, picking the viz that fits its type. */
export function ResultsChart({
  result,
  isAnonymous,
}: {
  result: QuestionResult;
  isAnonymous: boolean;
}) {
  if (result.type === "SHORT_ANSWER" || result.type === "LONG_ANSWER") {
    if (isAnonymous) {
      return (
        <p className="text-sm text-[color:var(--text-tertiary)]">
          {result.responseCount} {result.responseCount === 1 ? "response" : "responses"} — individual
          answers are hidden for anonymous surveys.
        </p>
      );
    }
    if (result.responses.length === 0) {
      return <p className="text-sm text-[color:var(--text-tertiary)]">No responses yet.</p>;
    }
    return (
      <ul className="space-y-2">
        {result.responses.map((text, i) => (
          <li
            key={i}
            className="rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {text}
          </li>
        ))}
      </ul>
    );
  }

  if (result.type === "LINEAR_SCALE") {
    const data = Object.entries(result.distribution).map(([label, count]) => ({ label, count }));
    return (
      <div className="space-y-2">
        <p className="text-sm text-[color:var(--text-secondary)]">
          Average{" "}
          <span className="font-bold text-[color:var(--text-primary)]">
            {result.average.toFixed(1)}
          </span>{" "}
          · range {result.min}–{result.max} · {result.responseCount}{" "}
          {result.responseCount === 1 ? "response" : "responses"}
        </p>
        <BarChart data={data} categoryKey="label" valueKey="count" height={200} />
      </div>
    );
  }

  if (result.type === "MULTIPLE_CHOICE" || result.type === "CHECKBOX") {
    const data = Object.entries(result.counts).map(([label, count]) => ({ label, count }));
    if (data.length === 0) {
      return <p className="text-sm text-[color:var(--text-tertiary)]">No responses yet.</p>;
    }
    return (
      <div className="space-y-2">
        <p className="text-sm text-[color:var(--text-secondary)]">
          {result.responseCount} {result.responseCount === 1 ? "response" : "responses"}
        </p>
        <BarChart data={data} categoryKey="label" valueKey="count" height={200} />
      </div>
    );
  }

  return null;
}
