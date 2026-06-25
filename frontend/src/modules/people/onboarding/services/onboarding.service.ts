import { apiFetch } from "@/shared/lib/api-client";
import type {
  CreateCustomFieldConfigInput,
  CreateDocumentConfigInput,
  DocumentSubmission,
  DocumentReview,
  EmployeeOnboardingStatus,
  HrCompleteOnboardingResult,
  OnboardEmployeeInput,
  OnboardEmployeeResult,
  BulkOnboardingCommitResult,
  BulkOnboardingPreviewResult,
  BulkOnboardingRowInput,
  OnboardingCustomFieldConfig,
  OnboardingDocStatus,
  OnboardingDocumentConfig,
  OnboardingInvitation,
  OnboardingProfile,
  SubmitCustomFieldAnswer,
  SubmitOnboardingForReviewResult,
  UpdateCustomFieldConfigInput,
  UpdateDocumentConfigInput,
  UpdateInvitationEmailInput,
  UpdateMyProfileInput,
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

/** Creates a required onboarding document on the default template. */
export async function createDocumentConfig(
  input: CreateDocumentConfigInput,
): Promise<OnboardingDocumentConfig> {
  const res = await apiFetch<Envelope<OnboardingDocumentConfig>>(`${HR_BASE}/documents`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** Updates a required onboarding document config. */
export async function updateDocumentConfig(
  id: string,
  input: UpdateDocumentConfigInput,
): Promise<OnboardingDocumentConfig> {
  const res = await apiFetch<Envelope<OnboardingDocumentConfig>>(`${HR_BASE}/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** Deletes a required onboarding document config. */
export async function deleteDocumentConfig(id: string): Promise<OnboardingDocumentConfig> {
  const res = await apiFetch<Envelope<OnboardingDocumentConfig>>(`${HR_BASE}/documents/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

/** Creates a custom onboarding field on the default template. */
export async function createCustomFieldConfig(
  input: CreateCustomFieldConfigInput,
): Promise<OnboardingCustomFieldConfig> {
  const res = await apiFetch<Envelope<OnboardingCustomFieldConfig>>(`${HR_BASE}/custom-fields`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** Updates a custom onboarding field config. */
export async function updateCustomFieldConfig(
  id: string,
  input: UpdateCustomFieldConfigInput,
): Promise<OnboardingCustomFieldConfig> {
  const res = await apiFetch<Envelope<OnboardingCustomFieldConfig>>(
    `${HR_BASE}/custom-fields/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return res.data;
}

/** Deletes a custom onboarding field config. */
export async function deleteCustomFieldConfig(id: string): Promise<OnboardingCustomFieldConfig> {
  const res = await apiFetch<Envelope<OnboardingCustomFieldConfig>>(
    `${HR_BASE}/custom-fields/${id}`,
    { method: "DELETE" },
  );
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

export async function previewBulkOnboarding(
  rows: BulkOnboardingRowInput[],
): Promise<BulkOnboardingPreviewResult> {
  const res = await apiFetch<Envelope<BulkOnboardingPreviewResult>>(`${HR_BASE}/bulk/preview`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
  return res.data;
}

export async function commitBulkOnboarding(
  rows: BulkOnboardingRowInput[],
): Promise<BulkOnboardingCommitResult> {
  const res = await apiFetch<Envelope<BulkOnboardingCommitResult>>(`${HR_BASE}/bulk/commit`, {
    method: "POST",
    body: JSON.stringify({ rows }),
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

/** Lists invitations for an onboarding record. */
export async function getInvitationStatus(recordId: string): Promise<OnboardingInvitation[]> {
  const res = await apiFetch<Envelope<OnboardingInvitation[]>>(
    `${HR_BASE}/invitations/${recordId}`,
  );
  return res.data;
}

/** Resends an invitation by invitation id. */
export async function resendInvitation(invitationId: string): Promise<OnboardingInvitation> {
  const res = await apiFetch<Envelope<OnboardingInvitation>>(
    `${HR_BASE}/invitations/${invitationId}/resend`,
    { method: "POST" },
  );
  return res.data;
}

/** Corrects the invitation email before the employee signs in. */
export async function updateInvitationEmail(
  invitationId: string,
  input: UpdateInvitationEmailInput,
): Promise<OnboardingInvitation> {
  const res = await apiFetch<Envelope<OnboardingInvitation>>(
    `${HR_BASE}/invitations/${invitationId}/email`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
  return res.data;
}

// ─── Employee self-service ────────────────────────────────────────────────────

/** The signed-in employee's full onboarding checklist. */
export async function getMyOnboardingStatus(): Promise<EmployeeOnboardingStatus> {
  const res = await apiFetch<Envelope<EmployeeOnboardingStatus>>(`${EMP_BASE}/status`);
  return res.data;
}

/**
 * Loads the employee checklist and marks the invitation accepted on first visit.
 * Safe to call on every page load — already-accepted invitations return the checklist.
 */
export async function loadMyOnboardingStatus(): Promise<EmployeeOnboardingStatus> {
  try {
    const res = await apiFetch<Envelope<EmployeeOnboardingStatus>>(
      `${EMP_BASE}/accept-invitation`,
      { method: "POST" },
    );
    return res.data;
  } catch {
    return getMyOnboardingStatus();
  }
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

/** Confirms or updates HR pre-filled profile data during onboarding. */
export async function updateMyProfile(input: UpdateMyProfileInput): Promise<OnboardingProfile> {
  const res = await apiFetch<Envelope<OnboardingProfile>>(`${EMP_BASE}/profile`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** Submits (or re-submits) a required document by uploading the file to the backend. */
export async function submitDocument(
  documentId: string,
  file: File,
): Promise<DocumentSubmission> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch<Envelope<DocumentSubmission>>(
    `${EMP_BASE}/documents/${documentId}/submit`,
    { method: "POST", body: formData },
  );
  return res.data;
}

/** Submits the employee's onboarding to HR for document review (does not activate). */
export async function submitMyOnboardingForReview(): Promise<SubmitOnboardingForReviewResult> {
  const res = await apiFetch<Envelope<SubmitOnboardingForReviewResult>>(`${EMP_BASE}/complete`, {
    method: "POST",
  });
  return res.data;
}
