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
} from "../types/surveys.types";

const BASE = "/api/v1/pulse/surveys";

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
  return res.data;
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
