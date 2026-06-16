import { Router } from "express";
import { authenticate } from "../../../../core/middleware/auth.middleware";
import { ResponsesController } from "./responses.controller";

const responsesController = new ResponsesController();

export const responsesRouter = Router();

/** Submit answers to a pulse occurrence (any authenticated employee). Anonymity enforced server-side. */
responsesRouter.post(
  "/occurrences/:occurrenceId/respond",
  authenticate,
  responsesController.respond,
);
