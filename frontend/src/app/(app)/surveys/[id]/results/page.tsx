"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SurveyResults } from "@/modules/performance/surveys/components/survey-results";
import { useAuth } from "@/modules/auth/hooks/use-auth";

/** Shared results view for entitled non-HR viewers (supervisors/employees). The backend
 *  enforces scope + access; filters are HR-only so they are hidden here for non-HR.
 *  A deep link from an HR "results shared" notification carries ?teamId & ?occurrenceId so the
 *  supervisor lands directly on the granted small-team breakdown (their filter UI is hidden). */
export default function SharedSurveyResultsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { appUser } = useAuth();
  const isHR = appUser?.role === "HR" || appUser?.role === "ADMIN";

  const teamId = searchParams.get("teamId") ?? undefined;
  const occurrenceId = searchParams.get("occurrenceId") ?? undefined;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <SurveyResults
        surveyId={params.id}
        canFilter={isHR}
        initialFilter={teamId ? { teamId } : undefined}
        initialOccurrenceId={occurrenceId}
      />
    </div>
  );
}
