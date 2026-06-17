import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { CustomFieldsController } from "./custom-fields.controller";

const customFieldsController = new CustomFieldsController();

export const customFieldsRouter = Router();

/** HR or Admin only — manage onboarding custom text fields. */
customFieldsRouter.post(
  "/",
  requireRole("HR", "ADMIN"),
  customFieldsController.createCustomField,
);
customFieldsRouter.get(
  "/",
  requireRole("HR", "ADMIN"),
  customFieldsController.listCustomFields,
);
customFieldsRouter.get(
  "/:id",
  requireRole("HR", "ADMIN"),
  customFieldsController.getCustomField,
);
customFieldsRouter.put(
  "/:id",
  requireRole("HR", "ADMIN"),
  customFieldsController.updateCustomField,
);
customFieldsRouter.delete(
  "/:id",
  requireRole("HR", "ADMIN"),
  customFieldsController.deleteCustomField,
);
