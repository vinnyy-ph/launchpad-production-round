import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { OffboardingController } from "./offboarding.controller";

const offboardingController = new OffboardingController();

export const offboardingRouter = Router();

/** Initiate offboarding for an employee. ADMIN/HR only. */
offboardingRouter.post(
  "/",
  requireRole("ADMIN", "HR"),
  offboardingController.initiateOffboarding,
);

/** List offboarding records — all for ADMIN/HR, downward-chain scoped for supervisors. */
offboardingRouter.get("/", offboardingController.listOffboardings);

/** The caller's own offboarding record (offboardee self-view). Declared before /:id. */
offboardingRouter.get("/me", offboardingController.getMyOffboarding);

/** Offboarding detail. Authorized for ADMIN/HR, the offboardee, or a signatory. */
offboardingRouter.get("/:id", offboardingController.getOffboardingById);

/** Reassign the offboardee's direct reports and team leadership. ADMIN/HR only. */
offboardingRouter.post(
  "/:id/reassign",
  requireRole("ADMIN", "HR"),
  offboardingController.reassignReports,
);
