import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { DocumentsController } from "./documents.controller";

const documentsController = new DocumentsController();

export const documentsRouter = Router();

/** HR only — manage required onboarding documents. */
documentsRouter.post(
  "/",
  requireRole("HR"),
  documentsController.createDocument,
);
documentsRouter.get(
  "/",
  requireRole("HR"),
  documentsController.listDocuments,
);
documentsRouter.get(
  "/:id",
  requireRole("HR"),
  documentsController.getDocument,
);
documentsRouter.put(
  "/:id",
  requireRole("HR"),
  documentsController.updateDocument,
);
documentsRouter.delete(
  "/:id",
  requireRole("HR"),
  documentsController.deleteDocument,
);
