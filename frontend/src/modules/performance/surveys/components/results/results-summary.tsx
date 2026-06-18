"use client";

import type { ReactNode } from "react";
import { Badge } from "@/shared/ui";
import { BarChart3, ListChecks, ShieldCheck } from "lucide-react";
import type { SurveyResults } from "../../types/surveys.types";

/** Key statistics for a results view: total responses, question count, and anonymity. */
export function ResultsSummary({ results }: { results: SurveyResults }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile
        icon={<BarChart3 size={16} />}
        label="Total responses"
        value={String(results.totalResponses)}
      />
      <StatTile
        icon={<ListChecks size={16} />}
        label="Questions"
        value={String(results.questions.length)}
      />
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex items-center gap-2 text-[color:var(--text-tertiary)]">
          <ShieldCheck size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">Anonymity</span>
        </div>
        <div className="mt-2">
          <Badge variant={results.isAnonymous ? "success" : "neutral"}>
            {results.isAnonymous ? "Anonymous" : "Named"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="flex items-center gap-2 text-[color:var(--text-tertiary)]">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-[color:var(--text-primary)]">{value}</p>
    </div>
  );
}
