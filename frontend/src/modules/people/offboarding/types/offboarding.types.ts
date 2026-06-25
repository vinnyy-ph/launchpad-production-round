// Frontend types for the offboarding + clearance module. These mirror the backend DTOs
// in backend/src/modules/people/offboarding/** so the wire shapes stay in sync.
// Offboarding lives under /api/v1/offboarding/*; the signatory clearance actions live
// under /api/v1/clearance/*. The backend success envelope is { success, message, data }.

// ─── Shared lifecycle literals ────────────────────────────────────────────────

export type OffboardingStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type SignatoryStatus = "PENDING" | "SIGNED" | "REJECTED";

// ─── People sub-shapes ────────────────────────────────────────────────────────

export interface OffboardingEmployee {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: string | null;
  /** Google profile picture URL; null when the account has no photo. */
  avatarUrl: string | null;
  // Present on offboarding list/detail payloads (used for search); absent on the clearance
  // "offboardee" context, hence optional.
  middleName?: string | null;
  companyEmail?: string;
}

export interface OffboardingPerson {
  id: string;
  firstName: string;
  lastName: string;
}

/** One stored offboarding attachment with a resolved signed view URL. */
export interface OffboardingAttachment {
  id: string;
  url: string;
  fileName: string;
}

// ─── List (GET /api/v1/offboarding) ───────────────────────────────────────────

/** A row in the HR / supervisor offboarding list. */
export interface OffboardingListItem {
  id: string;
  employee: OffboardingEmployee;
  status: OffboardingStatus;
  tenderDate: string;
  effectiveDate: string;
  attachments: OffboardingAttachment[];
  createdAt: string;
  completedAt: string | null;
  signedCount: number;
  totalCount: number;
}

// ─── Detail (GET /api/v1/offboarding/:id and /me) ─────────────────────────────

/** One clearance signature request inside an offboarding case. */
export interface SignatureRequest {
  id: string;
  signatory: OffboardingPerson;
  purpose: string;
  requirements: string | null;
  status: SignatoryStatus;
  note: string | null;
  signatureImage: string | null;
  actionAt: string | null;
}

/** Full offboarding case detail. */
export interface OffboardingDetail {
  id: string;
  employee: OffboardingEmployee;
  initiatedBy: OffboardingPerson;
  clearanceTemplateId: string | null;
  status: OffboardingStatus;
  tenderDate: string;
  effectiveDate: string;
  attachments: OffboardingAttachment[];
  createdAt: string;
  completedAt: string | null;
  signatureRequests: SignatureRequest[];
}

export interface ClearanceTemplateOption {
  id: string;
  name: string;
  isDefault: boolean;
  signatoryCount: number;
}

// ─── Create (POST /api/v1/offboarding) ────────────────────────────────────────

/** Body for initiating an offboarding (ADMIN/HR). */
export interface InitiateOffboardingInput {
  employeeId: string;
  tenderDate: string;
  effectiveDate: string;
  clearanceTemplateId?: string;
  attachments?: File[];
  newSupervisorId?: string;
  newTeamLeaderId?: string;
}

// ─── Reassign (POST /api/v1/offboarding/:id/reassign) ─────────────────────────

export interface ReassignResult {
  offboardingId: string;
  reassignedReports: number;
  reassignedTeams: number;
  newSupervisorId: string;
  newTeamLeaderId: string;
}

// ─── Clearance versions (templates, GET/POST/PUT/DELETE /api/v1/clearance-templates) ──
// HR-managed named lists of signatories that offboarding snapshots at initiation.

/** One configured signatory on a clearance version. */
export interface ClearanceTemplateSignatory {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
  };
  purpose: string;
  requirements: string;
  order: number;
}

/** A clearance version with its ordered signatories. */
export interface ClearanceTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  /** Offboarding cases currently using this version — when > 0 it cannot be deleted. */
  inUseCount: number;
  signatories: ClearanceTemplateSignatory[];
  createdAt: string;
  updatedAt: string;
}

/** One signatory in a create/update version payload (order = array position). */
export interface ClearanceSignatoryInput {
  employeeId: string;
  purpose: string;
  requirements: string;
}

/** Body for creating a clearance version. */
export interface CreateClearanceTemplateInput {
  name: string;
  isDefault: boolean;
  signatories: ClearanceSignatoryInput[];
}

/** Body for editing a clearance version's name + signatories (default set separately). */
export interface UpdateClearanceTemplateInput {
  name: string;
  signatories: ClearanceSignatoryInput[];
}

// ─── Clearance (signatory actions) ────────────────────────────────────────────

/** A clearance row where the signed-in user is the signatory (GET /clearance/assigned). */
export interface AssignedClearance {
  requestId: string;
  offboardingId: string;
  purpose: string;
  requirements: string | null;
  status: SignatoryStatus;
  note: string | null;
  signatureImage: string | null;
  actionAt: string | null;
  offboardee: OffboardingEmployee;
  effectiveDate: string;
  recordStatus: OffboardingStatus;
}

/**
 * Result of a sign / reject / reset action. When `offboardingCompleted` /
 * `employeeInactivated` are true after a sign, the case closed and the employee
 * was deactivated — surface it and invalidate dependent queries.
 */
export interface ClearanceAction {
  requestId: string;
  offboardingId: string;
  status: SignatoryStatus;
  note: string | null;
  signatureImage: string | null;
  actionAt: string | null;
  offboardingCompleted: boolean;
  employeeInactivated: boolean;
}

// ─── Supervisor onboarding (read-only, GET /api/v1/supervisor-onboarding/status) ──
// Consumed read-only by the supervisor status screen so it can merge the onboarding
// side of "people in transition" with the offboarding list. The producing module is
// owned by the People engineer; this is just the wire shape we read.

export interface SupervisorOnboardingEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: string | null;
  /** Google profile picture URL; null when the account has no photo. */
  avatarUrl: string | null;
  status: "onboarding" | "completed";
  onboarding: {
    recordId: string;
    isComplete: boolean;
    completedAt: string | null;
    invitationStatus: "pending" | "accepted" | "expired" | "failed_delivery" | null;
    documentsSubmitted: number;
    documentsRequired: number;
    customFieldsFilled: number;
    customFieldsRequired: number;
  };
}
