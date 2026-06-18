// Public surface for the offboarding + clearance module (real API-wired).
export * from "./types/offboarding.types";
export * from "./services/offboarding.service";

export { useOffboardings, useOffboarding, useMyOffboarding } from "./hooks/use-offboarding";
export { useCreateOffboarding, useReassignOffboarding } from "./hooks/use-create-offboarding";
export {
  useAssignedClearances,
  useSignClearance,
  useRejectClearance,
  useResetClearance,
} from "./hooks/use-sign-clearance";
export { useSupervisorOnboardingStatus } from "./hooks/use-supervisor-onboarding-status";
