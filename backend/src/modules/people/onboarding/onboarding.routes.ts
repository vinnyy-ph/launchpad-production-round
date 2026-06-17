import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { OnboardingController } from "./onboarding.controller";

const onboardingController = new OnboardingController();

export const onboardingRouter = Router();

/** Creates a new employee and starts the onboarding process. HR or Admin only. */
onboardingRouter.post("/", requireRole("HR", "ADMIN"), onboardingController.onboardEmployee);
