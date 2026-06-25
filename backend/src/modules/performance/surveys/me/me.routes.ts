import { Router } from "express";
import { authenticate } from "../../../../core/middleware/auth.middleware";
import { MeController } from "./me.controller";

const controller = new MeController();

export const meSurveysRouter = Router();

/** GET /api/v1/pulse/me/surveys — any authenticated employee. Returns open pending surveys. */
meSurveysRouter.get("/", authenticate, controller.getPendingSurveys);

/** GET /api/v1/pulse/me/surveys/answered — pulses this employee has already completed. */
meSurveysRouter.get("/answered", authenticate, controller.getAnsweredSurveys);

/** GET /api/v1/pulse/me/surveys/answered/:occurrenceId — this employee's own answers for one
 *  completed occurrence (404 if they didn't answer it; no content for anonymous surveys). */
meSurveysRouter.get("/answered/:occurrenceId", authenticate, controller.getMyAnswers);
