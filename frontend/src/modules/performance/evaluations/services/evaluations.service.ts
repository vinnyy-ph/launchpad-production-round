import { apiFetch } from "@/shared/lib/api-client";
import type { Evaluation, EvaluationInput, Reviewee } from "../types/evaluations.types";

const BASE = "/api/v1/evaluations";

interface ListResponse {
  data: Evaluation[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
interface MutationResponse {
  data: Evaluation;
}

/** All evaluations visible to the current user (drafts I own + sent in my scope). */
export async function fetchEvaluations(): Promise<Evaluation[]> {
  const res = await apiFetch<ListResponse>(`${BASE}?limit=100`);
  return res.data;
}

/** The current supervisor's active direct reports (valid reviewees). */
export async function fetchReviewees(): Promise<Reviewee[]> {
  const res = await apiFetch<{ data: Reviewee[] }>(`${BASE}/reviewees`);
  return res.data;
}

export async function createEvaluation(input: EvaluationInput): Promise<Evaluation> {
  const res = await apiFetch<MutationResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateEvaluation(
  id: string,
  input: Partial<EvaluationInput>,
): Promise<Evaluation> {
  const res = await apiFetch<MutationResponse>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteEvaluation(id: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`${BASE}/${id}`, { method: "DELETE" });
}

export async function sendEvaluation(id: string): Promise<Evaluation> {
  const res = await apiFetch<MutationResponse>(`${BASE}/${id}/send`, { method: "PATCH" });
  return res.data;
}
