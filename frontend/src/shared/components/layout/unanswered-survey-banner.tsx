// Re-export the real (API-backed) banner so the app shell's import stays stable while the
// implementation lives with the surveys module. Replaces the former mock-DB version.
export { UnansweredSurveyBanner } from "@/modules/performance/surveys/components/unanswered-survey-banner";
