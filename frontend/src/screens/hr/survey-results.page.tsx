"use client";

import { useParams } from "next/navigation";
import { SurveyResults } from "@/modules/performance/surveys/components/survey-results";

export default function HRSurveyResultsPage() {
  const params = useParams<{ id: string }>();
  return <SurveyResults surveyId={params.id} />;
}
