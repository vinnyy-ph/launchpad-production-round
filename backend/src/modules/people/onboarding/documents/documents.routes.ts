import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { DocumentsController } from "./documents.controller";

const documentsController = new DocumentsController();

export const documentsRouter = Router();

/** HR or Admin only — manage required onboarding documents. */
documentsRouter.post(
  "/",
  requireRole("HR", "ADMIN"),
  documentsController.createDocument,
);
documentsRouter.get(
  "/",
  requireRole("HR", "ADMIN"),
  documentsController.listDocuments,
);
documentsRouter.get(
  "/:id",
  requireRole("HR", "ADMIN"),
  documentsController.getDocument,
);
documentsRouter.put(
  "/:id",
  requireRole("HR", "ADMIN"),
  documentsController.updateDocument,
);
documentsRouter.delete(
  "/:id",
  requireRole("HR", "ADMIN"),
  documentsController.deleteDocument,
);
