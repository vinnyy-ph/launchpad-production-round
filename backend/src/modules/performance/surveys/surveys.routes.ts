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

/** PATCH /api/v1/pulse/surveys/:surveyId — HR only. Updates an existing survey. */
router.patch("/:surveyId", requireRole("HR"), controller.updateSurvey);

/** DELETE /api/v1/pulse/surveys/:id — HR only. Soft-deletes a draft survey. */
router.delete("/:id", requireRole("HR"), controller.deleteSurvey);

/** PATCH /api/v1/pulse/surveys/:id/activate — HR only. Activates a survey, starting the first occurrence and snapshotting the audience. */
router.patch("/:id/activate", requireRole("HR"), controller.activateSurvey);

/** PATCH /api/v1/pulse/surveys/:id/deactivate — HR only. Deactivates a survey, closing the open occurrence. */
router.patch("/:id/deactivate", requireRole("HR"), controller.deactivateSurvey);

/** GET /api/v1/pulse/surveys/:id/occurrences — HR only. Lists all occurrences for a survey, paginated. */
router.get("/:id/occurrences", requireRole("HR"), controller.listOccurrences);

export { router as surveysRouter };
