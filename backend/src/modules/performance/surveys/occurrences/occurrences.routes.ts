import { Router } from "express";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { OccurrencesController } from "./occurrences.controller";

const controller = new OccurrencesController();

export const occurrencesRouter = Router();

/** GET /api/v1/pulse/occurrences/:occurrenceId — HR only. Returns a single survey occurrence in detail. */
occurrencesRouter.get(
  "/:occurrenceId",
  requireRole("HR"),
  controller.getOccurrence,
);
