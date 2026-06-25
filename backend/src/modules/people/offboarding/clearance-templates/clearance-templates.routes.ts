import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { ClearanceTemplatesController } from "./clearance-templates.controller";

const clearanceTemplatesController = new ClearanceTemplatesController();

export const clearanceTemplatesRouter = Router();

/** ADMIN/HR only — manage the clearance versions offboarding draws its signatories from. */
clearanceTemplatesRouter.get(
  "/",
  requireRole("ADMIN", "HR"),
  clearanceTemplatesController.listTemplates,
);
clearanceTemplatesRouter.post(
  "/",
  requireRole("ADMIN", "HR"),
  clearanceTemplatesController.createTemplate,
);
clearanceTemplatesRouter.put(
  "/:id",
  requireRole("ADMIN", "HR"),
  clearanceTemplatesController.updateTemplate,
);
clearanceTemplatesRouter.post(
  "/:id/default",
  requireRole("ADMIN", "HR"),
  clearanceTemplatesController.setDefaultTemplate,
);
clearanceTemplatesRouter.delete(
  "/:id",
  requireRole("ADMIN", "HR"),
  clearanceTemplatesController.deleteTemplate,
);
