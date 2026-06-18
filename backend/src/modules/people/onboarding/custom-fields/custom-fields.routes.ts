import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { CustomFieldsController } from "./custom-fields.controller";

const customFieldsController = new CustomFieldsController();

export const customFieldsRouter = Router();

/** HR only — manage onboarding custom text fields. */
customFieldsRouter.post(
  "/",
  requireRole("HR"),
  customFieldsController.createCustomField,
);
customFieldsRouter.get(
  "/",
  requireRole("HR"),
  customFieldsController.listCustomFields,
);
customFieldsRouter.get(
  "/:id",
  requireRole("HR"),
  customFieldsController.getCustomField,
);
customFieldsRouter.put(
  "/:id",
  requireRole("HR"),
  customFieldsController.updateCustomField,
);
customFieldsRouter.delete(
  "/:id",
  requireRole("HR"),
  customFieldsController.deleteCustomField,
);
