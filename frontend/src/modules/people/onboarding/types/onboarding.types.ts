// Frontend types for the onboarding module. These mirror the backend DTOs in
// backend/src/modules/people/onboarding/** so the wire shapes stay in sync.
// HR reads live under /api/v1/onboarding/*; the employee self-service flow lives
// under /api/v1/employee-onboarding/*.

// ─── Shared lifecycle literals (lowercase, as the backend serialises them) ────

export type OnboardingDocStatus = "pending" | "approved" | "rejected";
export type OnboardingInvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "failed_delivery";

// ─── HR: document reviews (GET /api/v1/onboarding/document-reviews) ───────────

export interface DocumentReviewEmployee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  companyEmail: string;
  jobTitle: string | null;
}

/** One employee document submission HR can approve or reject. */
export interface DocumentReview {
  id: string;
  recordId: string;
  documentId: string;
  documentName: string;
  fileUrl: string;
  status: OnboardingDocStatus;
  rejectionNote: string | null;
  reviewerId: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  employee: DocumentReviewEmployee;
}

// ─── HR: org-wide onboarding config ───────────────────────────────────────────

/** A required onboarding document defined by HR (GET /onboarding/documents). */
export interface OnboardingDocumentConfig {
  id: string;
  documentName: string;
  instructions: string | null;
  allowedFileTypes: string;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A custom onboarding field defined by HR (GET /onboarding/custom-fields). */
export interface OnboardingCustomFieldConfig {
  id: string;
  fieldLabel: string;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── HR: create employee (POST /api/v1/onboarding) ────────────────────────────

export interface OnboardEmployeeInput {
  companyEmail: string;
  jobTitle: string;
  supervisorId: string;
  department: string;
  personalEmail?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  birthday?: string;
  address?: string;
  emergencyContact?: string;
}

export interface OnboardedEmployee {
  id: string;
  companyEmail: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  status: string;
}

export interface OnboardEmployeeResult {
  employee: OnboardedEmployee;
  onboardingRecord: { id: string; isComplete: boolean; createdAt: string };
  invitation: {
    id: string;
    sentToEmail: string;
    status: string;
    sentAt: string;
    expiresAt: string;
  };
}

// ─── HR: complete onboarding (POST /api/v1/onboarding/:employeeId/complete) ────

export interface HrCompleteOnboardingResult {
  recordId: string;
  isComplete: boolean;
  completedAt: string;
  employeeStatus: "active";
}

// ─── HR: invitations (POST /api/v1/onboarding/invitations/...) ────────────────

export interface OnboardingInvitation {
  id: string;
  recordId: string;
  sentToEmail: string;
  status: OnboardingInvitationStatus;
  sentAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Employee self-service status (GET /api/v1/employee-onboarding/status) ─────

export interface OnboardingProfile {
  firstName: string;
  lastName: string;
  middleName: string | null;
  personalEmail: string | null;
  birthday: string | null;
  address: string | null;
  emergencyContact: string | null;
  jobTitle: string | null;
  department: string | null;
}

export interface OnboardingDocumentStatus {
  id: string;
  documentName: string;
  instructions: string | null;
  allowedFileTypes: string;
  isRequired: boolean;
  latestSubmission: {
    id: string;
    fileUrl: string;
    status: OnboardingDocStatus;
    rejectionNote: string | null;
    submittedAt: string;
    reviewedAt: string | null;
  } | null;
}

export interface OnboardingCustomFieldStatus {
  id: string;
  fieldLabel: string;
  isRequired: boolean;
  value: string | null;
}

/** Full onboarding checklist the signed-in employee sees. */
export interface EmployeeOnboardingStatus {
  recordId: string;
  isComplete: boolean;
  completedAt: string | null;
  invitationStatus: OnboardingInvitationStatus | null;
  profile: OnboardingProfile;
  documents: OnboardingDocumentStatus[];
  customFields: OnboardingCustomFieldStatus[];
}

/** A single answer the employee submits for a custom field. */
export interface SubmitCustomFieldAnswer {
  fieldId: string;
  value: string;
}
