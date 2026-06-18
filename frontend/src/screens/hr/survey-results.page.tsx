"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SurveyResults } from "@/modules/performance/surveys/components/survey-results";
import { useSurvey } from "@/modules/performance/surveys/hooks/use-survey";

export default function HRSurveyResultsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: survey } = useSurvey(id);

  return (
    <div>
      <Link
        href="/hr/surveys"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
      >
        <ArrowLeft size={15} /> Back to surveys
      </Link>
      <PageHeader
        level="page"
        title={survey ? `${survey.name} — results` : "Survey results"}
        subtitle="Summary, key statistics, and per-question breakdowns. Filter by team or supervisor."
      />
      <SurveyResults surveyId={id} />
    </div>
  );
}
