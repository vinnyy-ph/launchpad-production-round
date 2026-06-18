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
  AnswerInput,
  SurveyResults,
  ResultsFilter,
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

/** Aggregated results for a survey, optionally scoped by one team or supervisor filter. */
export async function fetchSurveyResults(
  surveyId: string,
  filter?: ResultsFilter,
): Promise<SurveyResults> {
  const qs = new URLSearchParams();
  if (filter?.teamId) qs.set("teamId", filter.teamId);
  if (filter?.supervisorId) qs.set("supervisorId", filter.supervisorId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch<{ data: SurveyResults }>(`${BASE}/${surveyId}/results${suffix}`);
  return res.data;
}
