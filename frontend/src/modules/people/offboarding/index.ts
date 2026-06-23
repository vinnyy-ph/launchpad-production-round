// Public surface for the offboarding + clearance module (real API-wired).
export * from "./types/offboarding.types";
export * from "./services/offboarding.service";

export { OffboardingCasesTable } from "./components/offboarding-cases-table";
export { InitiateOffboardingDialog } from "./components/initiate-offboarding-dialog";
export { MyOffboardingSection } from "./components/my-offboarding-section";
export { AssignedClearancesSection } from "./components/assigned-clearances-section";

export { useOffboardings, useOffboarding, useMyOffboarding } from "./hooks/use-offboarding";
export { useCreateOffboarding, useReassignOffboarding } from "./hooks/use-create-offboarding";
export { useClearanceTemplates } from "./hooks/use-clearance-templates";
export {
  useAssignedClearances,
  useSignClearance,
  useRejectClearance,
  useResetClearance,
  useReplaceClearanceSignatory,
} from "./hooks/use-sign-clearance";
export {
  useClearanceTemplates,
  useClearanceTemplateMutations,
} from "./hooks/use-clearance-templates";
export { useSupervisorOnboardingStatus } from "./hooks/use-supervisor-onboarding-status";
