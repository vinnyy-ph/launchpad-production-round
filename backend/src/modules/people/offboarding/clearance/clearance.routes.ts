import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { ClearanceController } from "./clearance.controller";

const clearanceController = new ClearanceController();

export const clearanceRouter = Router();

/** Clearance requests assigned to the caller (signatory queue + pending banner). */
clearanceRouter.get("/assigned", clearanceController.getAssignedClearances);

/** Clearance template options for HR/admin when starting offboarding. */
clearanceRouter.get(
  "/templates",
  requireRole("ADMIN", "HR"),
  clearanceController.listTemplates,
);

/** Sign a clearance request. Caller must be the request's signatory. */
clearanceRouter.post("/:requestId/sign", clearanceController.signClearance);

/** Reject a clearance request with a required note. Caller must be the signatory. */
clearanceRouter.post("/:requestId/reject", clearanceController.rejectClearance);

/** Replace the signatory on an in-progress clearance item. ADMIN/HR only. */
clearanceRouter.post(
  "/:requestId/replace-signatory",
  requireRole("ADMIN", "HR"),
  clearanceController.replaceSignatory,
);

/** Re-open a signed/rejected request to PENDING. ADMIN/HR or the signatory. */
clearanceRouter.post("/:requestId/reset", clearanceController.resetClearance);
