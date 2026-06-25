
import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { BulkOnboardingController } from "./bulk.controller";

const bulkOnboardingController = new BulkOnboardingController();

export const bulkOnboardingRouter = Router();

bulkOnboardingRouter.post(
  "/preview",
  requireRole("HR"),
  bulkOnboardingController.preview,
);
bulkOnboardingRouter.post(
  "/commit",
  requireRole("HR"),
  bulkOnboardingController.commit,
);
