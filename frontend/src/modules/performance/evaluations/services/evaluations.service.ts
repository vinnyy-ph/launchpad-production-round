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

function buildEvaluationFormData(input: Partial<EvaluationInput> & { send?: boolean }, files: File[]): FormData {
  const fd = new FormData();
  if (input.revieweeId !== undefined) fd.append("revieweeId", input.revieweeId);
  if (input.periodStart !== undefined) fd.append("periodStart", input.periodStart);
  if (input.periodEnd !== undefined) fd.append("periodEnd", input.periodEnd);
  if (input.grade !== undefined) fd.append("grade", String(input.grade));
  (input.highlights ?? []).forEach((h) => fd.append("highlights", h));
  (input.lowlights ?? []).forEach((l) => fd.append("lowlights", l));
  if (input.evaluation) fd.append("evaluation", input.evaluation);
  if (input.recommendation) fd.append("recommendation", input.recommendation);
  if (input.send !== undefined) fd.append("send", String(input.send));
  files.forEach((f) => fd.append("files", f));
  (input.links ?? []).forEach((l) =>
    fd.append("links", JSON.stringify({ url: l.url, ...(l.label ? { label: l.label } : {}) })),
  );
  (input.keepFiles ?? []).forEach((url) => fd.append("keepFiles", url));
  // The editor always owns the docs section; this tells the backend to rebuild the doc set
  // (even to empty = all docs removed) rather than leave existing docs untouched.
  fd.append("docsManaged", "1");
  return fd;
}

export async function createEvaluation(input: EvaluationInput, files: File[] = []): Promise<Evaluation> {
  const res = await apiFetch<MutationResponse>(BASE, {
    method: "POST",
    body: buildEvaluationFormData(input, files),
  });
  return res.data;
}

export async function updateEvaluation(
  id: string,
  input: Partial<EvaluationInput>,
  files: File[] = [],
): Promise<Evaluation> {
  const res = await apiFetch<MutationResponse>(`${BASE}/${id}`, {
    method: "PATCH",
    body: buildEvaluationFormData(input, files),
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

/** Employee explicitly acknowledges a sent evaluation issued to them. */
export async function acknowledgeEvaluation(id: string): Promise<Evaluation> {
  const res = await apiFetch<MutationResponse>(`${BASE}/${id}/acknowledge`, { method: "PATCH" });
  return res.data;
}

/**
 * Resolves a supporting document's short-lived same-origin proxy URL. The backend
 * authorizes the request (the docs aren't publicly accessible) and returns a tokenized
 * proxy path, used to preview the document inline in a modal or open it in a new tab.
 */
export async function getSupportingDocUrl(evaluationId: string, docIndex: number): Promise<string> {
  const { url } = await apiFetch<{ url: string }>(`${BASE}/${evaluationId}/documents/${docIndex}/download`);
  return url;
}

/**
 * Opens a supporting document in a new tab using its signed URL.
 */
export async function downloadSupportingDoc(evaluationId: string, docIndex: number): Promise<void> {
  const url = await getSupportingDocUrl(evaluationId, docIndex);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
