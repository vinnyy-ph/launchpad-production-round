import { Router } from "express";
import { requireSupervisor } from "../../../../core/middleware/roles.middleware";
import { SupervisorOnboardingController } from "./supervisor-onboarding.controller";

const supervisorOnboardingController = new SupervisorOnboardingController();

export const supervisorOnboardingRouter = Router();

/** Lists onboarding status for employees in the supervisor's reporting hierarchy. */
supervisorOnboardingRouter.get(
  "/status",
  requireSupervisor,
  supervisorOnboardingController.getOnboardingStatuses,
);
