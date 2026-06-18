import { Router } from "express";
import { ClearanceController } from "./clearance.controller";

const clearanceController = new ClearanceController();

export const clearanceRouter = Router();

/** Clearance requests assigned to the caller (signatory queue + pending banner). */
clearanceRouter.get("/assigned", clearanceController.getAssignedClearances);

/** Sign a clearance request. Caller must be the request's signatory. */
clearanceRouter.post("/:requestId/sign", clearanceController.signClearance);

/** Reject a clearance request with a required note. Caller must be the signatory. */
clearanceRouter.post("/:requestId/reject", clearanceController.rejectClearance);

/** Re-open a signed/rejected request to PENDING. ADMIN/HR or the signatory. */
clearanceRouter.post("/:requestId/reset", clearanceController.resetClearance);
