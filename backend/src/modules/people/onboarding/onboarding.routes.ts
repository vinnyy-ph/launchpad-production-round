import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { customFieldsRouter } from "./custom-fields";
import { documentReviewsRouter } from "./document-reviews";
import { documentsRouter } from "./documents";
import { invitationRouter } from "./invitation";
import { OnboardingController } from "./onboarding.controller";

const onboardingController = new OnboardingController();

export const onboardingRouter = Router();

/** Creates a new employee and starts the onboarding process. HR only. */
onboardingRouter.post("/", requireRole("HR"), onboardingController.onboardEmployee);

/** Marks an employee's onboarding complete when all requirements are met. HR only. */
onboardingRouter.post(
  "/:employeeId/complete",
  requireRole("HR"),
  onboardingController.completeOnboarding,
);

/**
 * Reads one new hire's onboarding checklist (custom-field answers + document
 * submission statuses) for an HR/Admin viewer. HR and Admin only.
 */
onboardingRouter.get(
  "/:employeeId/status",
  requireRole("ADMIN", "HR"),
  onboardingController.getStatus,
);

/** HR-managed required onboarding documents. */
onboardingRouter.use("/documents", documentsRouter);

/** HR review of employee document submissions. */
onboardingRouter.use("/document-reviews", documentReviewsRouter);

/** HR-managed onboarding custom text fields. */
onboardingRouter.use("/custom-fields", customFieldsRouter);

/** HR-managed onboarding invitations. */
onboardingRouter.use("/invitations", invitationRouter);
