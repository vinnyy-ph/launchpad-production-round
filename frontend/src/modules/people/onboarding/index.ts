// Public surface for the onboarding module (real API-wired).
export * from "./types/onboarding.types";
export * from "./services/onboarding.service";

export { InviteStatusBadge, inviteStatusLabel } from "./components/invite-status-badge";
export { OnboardingCasesTable } from "./components/onboarding-cases-table";
export { AddEmployeeDialog } from "./components/add-employee-dialog";
export { BulkUploadDropzone } from "./components/bulk/bulk-upload-dropzone";
export { DocumentReviewCard } from "./components/documents/document-review-card";
export { RejectDocumentDialog } from "./components/documents/reject-document-dialog";
export { DocumentUploadRow } from "./components/documents/document-upload";
export { DocumentConfigBuilder } from "./components/documents/document-config-builder";
export { CustomFieldForm } from "./components/custom-fields/custom-field-form";
export { CustomFieldBuilder } from "./components/custom-fields/custom-field-builder";

export { useOnboardingRecords } from "./hooks/use-onboarding-records";
export { useOnboardingRecord } from "./hooks/use-onboarding-record";
export { useApproveDocument, useRejectDocument } from "./hooks/use-review-document";
export { useSendInvite } from "./hooks/use-send-invite";
export {
  useInvitationStatus,
  useResendInvite,
  useUpdateInvitationEmail,
} from "./hooks/use-invitation";
export { useOnboardEmployee } from "./hooks/use-onboard-employee";
export { useBulkOnboardingCommit, useBulkOnboardingPreview } from "./hooks/use-bulk-upload";
export { useCompleteOnboarding } from "./hooks/use-complete-onboarding";
export {
  useDocumentConfigs,
  useCreateDocumentConfig,
  useUpdateDocumentConfig,
  useDeleteDocumentConfig,
} from "./hooks/use-document-configs";
export {
  useCustomFieldConfigs,
  useCreateCustomFieldConfig,
  useUpdateCustomFieldConfig,
  useDeleteCustomFieldConfig,
} from "./hooks/use-custom-field-configs";
export {
  useMyOnboarding,
  useSubmitCustomFields,
  useSubmitDocument,
  useSubmitMyOnboardingForReview,
} from "./hooks/use-my-onboarding";
