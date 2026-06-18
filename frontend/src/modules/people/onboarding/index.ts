// Public surface for the onboarding module (real API-wired).
export * from "./types/onboarding.types";
export * from "./services/onboarding.service";

export { useOnboardingRecords } from "./hooks/use-onboarding-records";
export { useOnboardingRecord } from "./hooks/use-onboarding-record";
export { useApproveDocument, useRejectDocument } from "./hooks/use-review-document";
export { useSendInvite } from "./hooks/use-send-invite";
export { useOnboardEmployee } from "./hooks/use-onboard-employee";
export { useCompleteOnboarding } from "./hooks/use-complete-onboarding";
export {
  useMyOnboarding,
  useSubmitCustomFields,
  useSubmitDocument,
  useCompleteMyOnboarding,
} from "./hooks/use-my-onboarding";
