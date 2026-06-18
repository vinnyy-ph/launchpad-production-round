import { apiFetch } from "@/shared/lib/api-client";
import type {
  DocumentReview,
  EmployeeOnboardingStatus,
  HrCompleteOnboardingResult,
  OnboardEmployeeInput,
  OnboardEmployeeResult,
  OnboardingCustomFieldConfig,
  OnboardingDocStatus,
  OnboardingDocumentConfig,
  OnboardingInvitation,
  SubmitCustomFieldAnswer,
} from "../types/onboarding.types";

const HR_BASE = "/api/v1/onboarding";
const EMP_BASE = "/api/v1/employee-onboarding";

// Backend success envelope: { success, message?, data }.
interface Envelope<T> {
  data: T;
}

// ─── HR reads ─────────────────────────────────────────────────────────────────

/**
 * Document submissions HR can review, optionally scoped to one status.
 * This is also the source HR uses to inspect a single employee's submissions
 * (filter the returned rows by `recordId`).
 */
export async function getDocumentReviews(
  status?: OnboardingDocStatus,
): Promise<DocumentReview[]> {
  const qs = status ? `?status=${status}` : "";
  const res = await apiFetch<Envelope<DocumentReview[]>>(`${HR_BASE}/document-reviews${qs}`);
  return res.data;
}

/**
 * One new hire's onboarding checklist for an HR/Admin viewer — the employee's
 * actual custom-field answers and document submission statuses. Same wire shape
 * the employee sees, located by employee id.
 */
export async function getOnboardingStatusForEmployee(
  employeeId: string,
): Promise<EmployeeOnboardingStatus> {
  const res = await apiFetch<Envelope<EmployeeOnboardingStatus>>(
    `${HR_BASE}/${employeeId}/status`,
  );
  return res.data;
}

/** Org-wide required onboarding documents configured by HR. */
export async function getDocumentConfigs(): Promise<OnboardingDocumentConfig[]> {
  const res = await apiFetch<Envelope<OnboardingDocumentConfig[]>>(`${HR_BASE}/documents`);
  return res.data;
}

/** Org-wide onboarding custom fields configured by HR. */
export async function getCustomFieldConfigs(): Promise<OnboardingCustomFieldConfig[]> {
  const res = await apiFetch<Envelope<OnboardingCustomFieldConfig[]>>(`${HR_BASE}/custom-fields`);
  return res.data;
}

// ─── HR mutations ─────────────────────────────────────────────────────────────

/** Creates a new employee and starts their onboarding (sends an invitation). */
export async function onboardEmployee(
  input: OnboardEmployeeInput,
): Promise<OnboardEmployeeResult> {
  const res = await apiFetch<Envelope<OnboardEmployeeResult>>(HR_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** Marks an employee's onboarding complete (flips them to Active). */
export async function completeOnboarding(
  employeeId: string,
): Promise<HrCompleteOnboardingResult> {
  const res = await apiFetch<Envelope<HrCompleteOnboardingResult>>(
    `${HR_BASE}/${employeeId}/complete`,
    { method: "POST" },
  );
  return res.data;
}

/** Approves a pending document submission. */
export async function approveDocument(submissionId: string): Promise<DocumentReview> {
  const res = await apiFetch<Envelope<DocumentReview>>(
    `${HR_BASE}/document-reviews/${submissionId}/approve`,
    { method: "PATCH" },
  );
  return res.data;
}

/** Rejects a pending document submission with a note for the employee. */
export async function rejectDocument(
  submissionId: string,
  rejectionNote: string,
): Promise<DocumentReview> {
  const res = await apiFetch<Envelope<DocumentReview>>(
    `${HR_BASE}/document-reviews/${submissionId}/reject`,
    { method: "PATCH", body: JSON.stringify({ rejectionNote }) },
  );
  return res.data;
}

/** (Re)sends the onboarding invitation for a record. */
export async function sendInvitation(recordId: string): Promise<OnboardingInvitation> {
  const res = await apiFetch<Envelope<OnboardingInvitation>>(
    `${HR_BASE}/invitations/${recordId}/send`,
    { method: "POST" },
  );
  return res.data;
}

// ─── Employee self-service ────────────────────────────────────────────────────

/** The signed-in employee's full onboarding checklist. */
export async function getMyOnboardingStatus(): Promise<EmployeeOnboardingStatus> {
  const res = await apiFetch<Envelope<EmployeeOnboardingStatus>>(`${EMP_BASE}/status`);
  return res.data;
}

/** Submits the employee's custom field answers. */
export async function submitCustomFields(
  fields: SubmitCustomFieldAnswer[],
): Promise<EmployeeOnboardingStatus> {
  const res = await apiFetch<Envelope<EmployeeOnboardingStatus>>(`${EMP_BASE}/custom-fields`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  return res.data;
}

/** Submits (or re-submits) a required document by uploading a file URL. */
export async function submitDocument(
  documentId: string,
  fileUrl: string,
): Promise<EmployeeOnboardingStatus> {
  const res = await apiFetch<Envelope<EmployeeOnboardingStatus>>(
    `${EMP_BASE}/documents/${documentId}/submit`,
    { method: "POST", body: JSON.stringify({ fileUrl }) },
  );
  return res.data;
}

/** Marks the employee's own onboarding complete once everything is in. */
export async function completeMyOnboarding(): Promise<EmployeeOnboardingStatus> {
  const res = await apiFetch<Envelope<EmployeeOnboardingStatus>>(`${EMP_BASE}/complete`, {
    method: "POST",
  });
  return res.data;
}
