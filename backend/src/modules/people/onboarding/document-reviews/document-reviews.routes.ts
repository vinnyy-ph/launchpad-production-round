import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { DocumentReviewsController } from "./document-reviews.controller";

const documentReviewsController = new DocumentReviewsController();

export const documentReviewsRouter = Router();

/** HR only — review employee onboarding document submissions. */
documentReviewsRouter.get(
  "/",
  requireRole("HR"),
  documentReviewsController.listDocumentReviews,
);
documentReviewsRouter.patch(
  "/:submissionId/approve",
  requireRole("HR"),
  documentReviewsController.approveDocument,
);
documentReviewsRouter.patch(
  "/:submissionId/reject",
  requireRole("HR"),
  documentReviewsController.rejectDocument,
);
