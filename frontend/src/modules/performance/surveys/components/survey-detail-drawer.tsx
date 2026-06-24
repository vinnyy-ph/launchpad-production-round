"use client";

import { Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/ui/primitives/sheet";
import { Badge, BadgeDot, Button, Skeleton } from "@/shared/ui";
import { useSurveyInsights } from "../hooks/use-survey-insights";
import type { SurveyListItem, SurveyStatus } from "../types/surveys.types";
import { STATUS_LABEL, deriveStatus } from "../types/surveys.types";

const STATUS_VARIANT: Record<SurveyStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  draft: "neutral",
  closed: "warning",
};

export function SurveyDetailDrawer({
  survey,
  open,
  onOpenChange,
  onViewResults,
}: {
  survey: SurveyListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewResults: (surveyId: string) => void;
}) {
  // Auto-fetch the one-liner as soon as a survey is selected.
  const q = useSurveyInsights(survey?.id ?? "", { enabled: open && !!survey });
  const status = survey ? deriveStatus(survey) : "draft";
  const data = q.data;

  const oneLine = () => {
    if (q.isLoading) return null;
    if (q.isError) return "Couldn't load the AI insight.";
    if (!data) return null;
    if (data.insight) return data.insight.oneLiner;
    if (data.reason === "no_open_text") return "No open-text questions to summarize.";
    if (data.suppressed) return "Not enough responses yet for an anonymous summary.";
    return "No written responses yet.";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        {survey && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle>{survey.name}</SheetTitle>
                <Badge variant={STATUS_VARIANT[status]} pill>
                  <BadgeDot />
                  {STATUS_LABEL[status]}
                </Badge>
              </div>
              <SheetDescription>
                {survey.respondedCount} of {survey.recipientCount} responded
              </SheetDescription>
            </SheetHeader>

            {/* One-line AI insight */}
            <div className="mt-6 rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={15} className="text-[color:var(--brand-blue)]" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                  AI insight
                </span>
              </div>
              {q.isLoading ? (
                <Skeleton className="h-5 w-5/6" />
              ) : (
                <p className="text-[14px] leading-snug text-[color:var(--text-primary)]">
                  {oneLine()}
                </p>
              )}
            </div>

            <div className="mt-auto pt-6">
              <Button className="w-full" onClick={() => onViewResults(survey.id)}>
                View full results
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
