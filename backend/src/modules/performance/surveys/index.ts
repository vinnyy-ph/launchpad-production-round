import { Router } from "express";
import { responsesRouter } from "./responses";

/** Aggregate router for the Pulse Surveys module. Mounted at /api/v1/pulse in app.ts. */
export const pulseSurveysRouter = Router();
pulseSurveysRouter.use(responsesRouter);
