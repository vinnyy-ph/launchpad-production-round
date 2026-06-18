import { Router } from "express";
import { authenticate } from "../../../core/middleware/auth.middleware";
import { surveysRouter } from "./surveys.routes";
import { responsesRouter } from "./responses";
import { occurrencesRouter } from "./occurrences";
import { meSurveysRouter } from "./me";

/** Aggregate router for the Pulse Surveys module. Mounted at /api/v1/pulse in app.ts. */
export const pulseSurveysRouter = Router();

// All pulse routes require authentication
pulseSurveysRouter.use(authenticate);

// POST /api/v1/pulse/surveys  (HR only — guarded inside surveysRouter)
pulseSurveysRouter.use("/surveys", surveysRouter);

// GET /api/v1/pulse/occurrences/:occurrenceId (HR only — guarded inside occurrencesRouter)
pulseSurveysRouter.use("/occurrences", occurrencesRouter);

// GET /api/v1/pulse/me/surveys (any authenticated employee)
pulseSurveysRouter.use("/me/surveys", meSurveysRouter);

// POST /api/v1/pulse/occurrences/:occurrenceId/respond  (any authenticated employee)
pulseSurveysRouter.use(responsesRouter);
