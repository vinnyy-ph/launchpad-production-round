import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { SurveysController } from "./surveys.controller";

const router = Router();
const controller = new SurveysController();

/** GET /api/v1/pulse/surveys — HR only. Lists pulse surveys with optional status filter and pagination. */
router.get("/", requireRole("HR"), controller.listSurveys);

/** GET /api/v1/pulse/surveys/:surveyId — HR only. Returns full survey detail. */
router.get("/:surveyId", requireRole("HR"), controller.getSurvey);

/** POST /api/v1/pulse/surveys — HR only. Creates a PulseSurvey with questions, optional audience configs, and optional reminder config. */
router.post("/", requireRole("HR"), controller.createSurvey);

export { router as surveysRouter };
