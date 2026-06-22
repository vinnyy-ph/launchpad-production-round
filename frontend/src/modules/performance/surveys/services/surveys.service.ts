import { apiFetch } from "@/shared/lib/api-client";
import type {
  SurveyListItem,
  SurveyDetail,
  CreateSurveyInput,
  UpdateSurveyInput,
  AudienceOptions,
  AudiencePreview,
  PreviewAudienceInput,
  SurveyStatus,
  PendingSurvey,
  AnsweredSurvey,
  AnswerInput,
  SurveyResults,
  ResultsFilter,
  SurveyOccurrenceSummary,
  VisibleResultSurvey,
  MyAnswers,
  SurveyInsight,
} from "../types/surveys.types";
import { normalizeQuestionOptions } from "../types/surveys.types";

const BASE = "/api/v1/pulse/surveys";
const PULSE = "/api/v1/pulse";

interface ListResponse {
  data: SurveyListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** All pulse surveys, optionally filtered by derived status. */
export async function fetchSurveys(status?: SurveyStatus): Promise<SurveyListItem[]> {
  const qs = new URLSearchParams({ limit: "100" });
  if (status) qs.set("status", status);
  const res = await apiFetch<ListResponse>(`${BASE}?${qs.toString()}`);
  return res.data;
}

/** Full detail of one survey, including questions and audience config. */
export async function getSurvey(id: string): Promise<SurveyDetail> {
  const res = await apiFetch<{ data: SurveyDetail }>(`${BASE}/${id}`);
  return {
    ...res.data,
    questions: res.data.questions.map((q) => ({
      ...q,
      options: normalizeQuestionOptions(q.options),
    })),
  };
}

export async function createSurvey(input: CreateSurveyInput): Promise<SurveyDetail> {
  const res = await apiFetch<{ data: SurveyDetail }>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateSurvey(
  id: string,
  input: UpdateSurveyInput,
): Promise<SurveyDetail> {
  const res = await apiFetch<{ data: SurveyDetail }>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteSurvey(id: string): Promise<void> {
  await apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

/** Snapshots the audience to occurrence 1 and sets the survey live. */
export async function activateSurvey(id: string): Promise<SurveyDetail> {
  const res = await apiFetch<{ data: SurveyDetail }>(`${BASE}/${id}/activate`, {
    method: "PATCH",
  });
  return res.data;
}

export async function deactivateSurvey(id: string): Promise<SurveyDetail> {
  const res = await apiFetch<{ data: SurveyDetail }>(`${BASE}/${id}/deactivate`, {
    method: "PATCH",
  });
  return res.data;
}

/** Selectable supervisors and teams for audience targeting (HR-only). */
export async function fetchAudienceOptions(): Promise<AudienceOptions> {
  const res = await apiFetch<{ data: AudienceOptions }>(`${BASE}/audience/options`);
  return res.data;
}

/** Live "who will receive this" preview for the current audience selection. */
export async function previewAudience(
  input: PreviewAudienceInput,
): Promise<AudiencePreview> {
  const res = await apiFetch<{ data: AudiencePreview }>(`${BASE}/audience/preview`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

// ─── Employee answer flow (PER-10) ─────────────────────────────────────────────

/** The signed-in employee's open pulses to answer. */
export async function fetchMySurveys(): Promise<PendingSurvey[]> {
  const res = await apiFetch<{ data: PendingSurvey[] }>(`${PULSE}/me/surveys`);
  return res.data.map((s) => ({
    ...s,
    questions: s.questions.map((q) => ({
      ...q,
      options: normalizeQuestionOptions(q.options),
    })),
  }));
}

/** The signed-in employee's already-answered pulses (history). */
export async function fetchAnsweredSurveys(): Promise<AnsweredSurvey[]> {
  const res = await apiFetch<{ data: AnsweredSurvey[] }>(`${PULSE}/me/surveys/answered`);
  return res.data;
}

/** The signed-in employee's own answers for one completed occurrence (PER-23).
 *  Anonymous surveys return no answers — content is unrecoverable by design. */
export async function fetchMyAnswers(occurrenceId: string): Promise<MyAnswers> {
  const res = await apiFetch<{ data: MyAnswers }>(
    `${PULSE}/me/surveys/answered/${occurrenceId}`,
  );
  return {
    ...res.data,
    answers: res.data.answers.map((a) => ({
      ...a,
      options: a.options == null ? null : normalizeQuestionOptions(a.options),
    })),
  };
}

/** Submit answers to a pulse occurrence. Anonymity + validation enforced server-side. */
export async function submitResponse(
  occurrenceId: string,
  answers: AnswerInput[],
): Promise<void> {
  await apiFetch<void>(`${PULSE}/occurrences/${occurrenceId}/respond`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

// ─── Results (PER-08 / PER-11) ─────────────────────────────────────────────────

/**
 * Aggregated results for a survey, optionally scoped by one team/supervisor filter and/or a
 * specific occurrence (round). With no occurrenceId the server defaults to the latest round.
 */
export async function fetchSurveyResults(
  surveyId: string,
  filter?: ResultsFilter,
  occurrenceId?: string,
): Promise<SurveyResults> {
  const qs = new URLSearchParams();
  if (filter?.teamId) qs.set("teamId", filter.teamId);
  if (filter?.supervisorId) qs.set("supervisorId", filter.supervisorId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  // A chosen round hits the per-occurrence route; the default (latest) uses the survey route.
  const path = occurrenceId
    ? `${BASE}/occurrences/${occurrenceId}/results${suffix}`
    : `${BASE}/${surveyId}/results${suffix}`;
  const res = await apiFetch<{ data: SurveyResults }>(path);
  return res.data;
}

/** All rounds of a recurring survey (HR only), newest first, for the results-page round picker. */
export async function fetchSurveyOccurrences(
  surveyId: string,
): Promise<SurveyOccurrenceSummary[]> {
  const res = await apiFetch<{ data: SurveyOccurrenceSummary[] }>(
    `${BASE}/${surveyId}/occurrences?limit=100`,
  );
  return [...res.data].sort((a, b) => b.occurrenceNumber - a.occurrenceNumber);
}

/** Surveys whose results the signed-in user may view (supervisor/employee discovery). */
export async function fetchVisibleResultSurveys(): Promise<VisibleResultSurvey[]> {
  const res = await apiFetch<{ data: VisibleResultSurvey[] }>(`${PULSE}/me/result-surveys`);
  return res.data;
}

/** AI summary of a survey's open-text responses. Visibility/anonymity enforced server-side. */
export async function fetchSurveyInsights(
  surveyId: string,
  opts?: { refresh?: boolean },
): Promise<SurveyInsight> {
  const suffix = opts?.refresh ? "?refresh=true" : "";
  const res = await apiFetch<{ data: SurveyInsight }>(`${BASE}/${surveyId}/insights${suffix}`);
  return res.data;
}
