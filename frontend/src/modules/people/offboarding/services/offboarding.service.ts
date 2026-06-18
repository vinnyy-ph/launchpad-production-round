import { apiFetch } from "@/shared/lib/api-client";
import type {
  AssignedClearance,
  ClearanceAction,
  InitiateOffboardingInput,
  OffboardingDetail,
  OffboardingListItem,
  ReassignResult,
  SupervisorOnboardingEmployee,
} from "../types/offboarding.types";

const OFFBOARDING_BASE = "/api/v1/offboarding";
const CLEARANCE_BASE = "/api/v1/clearance";
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
  const res = await apiFetch<Envelope<OffboardingDetail>>(OFFBOARDING_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** Reassigns the offboardee's direct reports + led teams to a new supervisor (ADMIN/HR). */
export async function reassignOffboarding(
  id: string,
  newSupervisorId: string,
): Promise<ReassignResult> {
  const res = await apiFetch<Envelope<ReassignResult>>(`${OFFBOARDING_BASE}/${id}/reassign`, {
    method: "POST",
    body: JSON.stringify({ newSupervisorId }),
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
  note?: string,
): Promise<ClearanceAction> {
  const res = await apiFetch<Envelope<ClearanceAction>>(`${CLEARANCE_BASE}/${requestId}/sign`, {
    method: "POST",
    body: JSON.stringify(note ? { note } : {}),
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
