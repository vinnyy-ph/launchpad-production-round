"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SurveyResults } from "@/modules/performance/surveys/components/survey-results";

export default function HRSurveyResultsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <div>
      <Link
        href="/hr/surveys"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
      >
        <ArrowLeft size={15} /> Back to surveys
      </Link>
      <SurveyResults surveyId={id} />
    </div>
  );
}
