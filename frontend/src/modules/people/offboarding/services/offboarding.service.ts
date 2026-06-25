import { apiFetch } from "@/shared/lib/api-client";
import type {
  AssignedClearance,
  ClearanceAction,
  ClearanceTemplate,
  CreateClearanceTemplateInput,
  ClearanceTemplateOption,
  InitiateOffboardingInput,
  OffboardingDetail,
  OffboardingListItem,
  ReassignResult,
  SupervisorOnboardingEmployee,
  UpdateClearanceTemplateInput,
} from "../types/offboarding.types";

const OFFBOARDING_BASE = "/api/v1/offboarding";
const CLEARANCE_BASE = "/api/v1/clearance";
const CLEARANCE_TEMPLATES_BASE = "/api/v1/clearance-templates";
const SUPERVISOR_ONBOARDING_BASE = "/api/v1/supervisor-onboarding";

// Backend success envelope: { success, message, data }.
interface Envelope<T> {
  data: T;
}

// ─── Offboarding ──────────────────────────────────────────────────────────────

/** List of offboarding cases — HR sees all, supervisors see their downward chain. */
export async function getOffboardings(): Promise<OffboardingListItem[]> {
  const res = await apiFetch<Envelope<OffboardingListItem[]>>(OFFBOARDING_BASE);
  return res.data;
}

/** The signed-in employee's own offboarding case (null when none). */
export async function getMyOffboarding(): Promise<OffboardingDetail | null> {
  const res = await apiFetch<Envelope<OffboardingDetail | null>>(`${OFFBOARDING_BASE}/me`);
  return res.data;
}

/** One offboarding case (ADMIN/HR, the offboardee, or a signatory). */
export async function getOffboarding(id: string): Promise<OffboardingDetail> {
  const res = await apiFetch<Envelope<OffboardingDetail>>(`${OFFBOARDING_BASE}/${id}`);
  return res.data;
}

/** Initiates an offboarding (ADMIN/HR). */
export async function initiateOffboarding(
  input: InitiateOffboardingInput,
): Promise<OffboardingDetail> {
  const { attachments, ...jsonInput } = input;
  const hasAttachments = Boolean(attachments && attachments.length > 0);
  const body = hasAttachments ? buildOffboardingFormData(input) : JSON.stringify(jsonInput);
  const res = await apiFetch<Envelope<OffboardingDetail>>(OFFBOARDING_BASE, {
    method: "POST",
    body,
  });
  return res.data;
}

function buildOffboardingFormData(input: InitiateOffboardingInput): FormData {
  const formData = new FormData();
  formData.append("employeeId", input.employeeId);
  formData.append("tenderDate", input.tenderDate);
  formData.append("effectiveDate", input.effectiveDate);
  if (input.clearanceTemplateId) {
    formData.append("clearanceTemplateId", input.clearanceTemplateId);
  }
  if (input.newSupervisorId) {
    formData.append("newSupervisorId", input.newSupervisorId);
  }
  if (input.newTeamLeaderId) {
    formData.append("newTeamLeaderId", input.newTeamLeaderId);
  }
  for (const file of input.attachments ?? []) {
    formData.append("attachments", file);
  }
  return formData;
}

/** Lightweight clearance version options HR picks from while initiating an offboarding. */
export async function getClearanceTemplateOptions(): Promise<ClearanceTemplateOption[]> {
  const res = await apiFetch<Envelope<ClearanceTemplateOption[]>>(`${CLEARANCE_BASE}/templates`);
  return res.data;
}

/** Reassigns the offboardee's direct reports + led teams to a new supervisor (ADMIN/HR). */
export async function reassignOffboarding(
  id: string,
  newSupervisorId: string,
  newTeamLeaderId?: string,
): Promise<ReassignResult> {
  const res = await apiFetch<Envelope<ReassignResult>>(`${OFFBOARDING_BASE}/${id}/reassign`, {
    method: "POST",
    body: JSON.stringify({ newSupervisorId, ...(newTeamLeaderId ? { newTeamLeaderId } : {}) }),
  });
  return res.data;
}

// ─── Clearance (signatory actions) ────────────────────────────────────────────

/** Clearance requests where the signed-in user is the signatory. */
export async function getAssignedClearances(): Promise<AssignedClearance[]> {
  const res = await apiFetch<Envelope<AssignedClearance[]>>(`${CLEARANCE_BASE}/assigned`);
  return res.data;
}

/** Signs a clearance request (optional note). */
export async function signClearance(
  requestId: string,
  signatureImage: string,
  note?: string,
): Promise<ClearanceAction> {
  const res = await apiFetch<Envelope<ClearanceAction>>(`${CLEARANCE_BASE}/${requestId}/sign`, {
    method: "POST",
    body: JSON.stringify({ signatureImage, ...(note ? { note } : {}) }),
  });
  return res.data;
}

/** Rejects a clearance request (note required). */
export async function rejectClearance(
  requestId: string,
  note: string,
): Promise<ClearanceAction> {
  const res = await apiFetch<Envelope<ClearanceAction>>(`${CLEARANCE_BASE}/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
  return res.data;
}

/** Resets a clearance request back to pending (ADMIN/HR or that signatory). */
export async function resetClearance(requestId: string): Promise<ClearanceAction> {
  const res = await apiFetch<Envelope<ClearanceAction>>(`${CLEARANCE_BASE}/${requestId}/reset`, {
    method: "POST",
  });
  return res.data;
}

/** Replaces the signatory on an in-progress clearance item (ADMIN/HR). */
export async function replaceClearanceSignatory(
  requestId: string,
  newSignatoryId: string,
): Promise<ClearanceAction> {
  const res = await apiFetch<Envelope<ClearanceAction>>(
    `${CLEARANCE_BASE}/${requestId}/replace-signatory`,
    {
      method: "POST",
      body: JSON.stringify({ newSignatoryId }),
    },
  );
  return res.data;
}

// ─── Clearance versions (templates, ADMIN/HR) ─────────────────────────────────

/** All clearance versions with their signatories (default first). */
export async function getClearanceTemplates(): Promise<ClearanceTemplate[]> {
  const res = await apiFetch<Envelope<ClearanceTemplate[]>>(CLEARANCE_TEMPLATES_BASE);
  return res.data;
}

/** Creates a clearance version. */
export async function createClearanceTemplate(
  input: CreateClearanceTemplateInput,
): Promise<ClearanceTemplate> {
  const res = await apiFetch<Envelope<ClearanceTemplate>>(CLEARANCE_TEMPLATES_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** Edits a clearance version's name + signatories. */
export async function updateClearanceTemplate(
  id: string,
  input: UpdateClearanceTemplateInput,
): Promise<ClearanceTemplate> {
  const res = await apiFetch<Envelope<ClearanceTemplate>>(`${CLEARANCE_TEMPLATES_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** Sets a clearance version as the default. */
export async function setDefaultClearanceTemplate(id: string): Promise<ClearanceTemplate> {
  const res = await apiFetch<Envelope<ClearanceTemplate>>(
    `${CLEARANCE_TEMPLATES_BASE}/${id}/default`,
    { method: "POST" },
  );
  return res.data;
}

/** Deletes a clearance version (blocked when in use by an offboarding case). */
export async function deleteClearanceTemplate(id: string): Promise<void> {
  await apiFetch(`${CLEARANCE_TEMPLATES_BASE}/${id}`, { method: "DELETE" });
}

// ─── Supervisor onboarding (read-only) ────────────────────────────────────────

/**
 * The onboarding side of a supervisor's downward chain — read-only, used to merge with
 * the offboarding list on the supervisor status screen. Owned by the People module.
 */
export async function getSupervisorOnboardingStatus(): Promise<SupervisorOnboardingEmployee[]> {
  const res = await apiFetch<Envelope<SupervisorOnboardingEmployee[]>>(
    `${SUPERVISOR_ONBOARDING_BASE}/status`,
  );
  return res.data;
}
