import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { SurveysController } from "./surveys.controller";

const router = Router();
const controller = new SurveysController();

/** POST /api/v1/pulse/surveys — HR only. Creates a PulseSurvey with questions, optional audience configs, and optional reminder config. */
router.post("/", requireRole("HR"), controller.createSurvey);

export { router as surveysRouter };
