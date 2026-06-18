import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { EmployeeOnboardingController } from "./employee-onboarding.controller";

const employeeOnboardingController = new EmployeeOnboardingController();

export const employeeOnboardingRouter = Router();

/** Employee only — accept the onboarding invitation. */
employeeOnboardingRouter.post(
  "/accept-invitation",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.acceptInvitation,
);

/** Employee only — view onboarding checklist and progress. */
employeeOnboardingRouter.get(
  "/status",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.getStatus,
);

/** Employee only — confirm or edit pre-filled profile data. */
employeeOnboardingRouter.patch(
  "/profile",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.updateProfile,
);

/** Employee only — submit custom field answers. */
employeeOnboardingRouter.post(
  "/custom-fields",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.submitCustomFields,
);

/** Employee only — upload or re-upload a required document. */
employeeOnboardingRouter.post(
  "/documents/:documentId/submit",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.submitDocument,
);

/** Employee only — mark onboarding complete. */
employeeOnboardingRouter.post(
  "/complete",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.completeOnboarding,
);
