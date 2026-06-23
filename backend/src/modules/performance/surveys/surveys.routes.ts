import { Router } from "express";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { SurveysController } from "./surveys.controller";
import { ResultsController } from "./results/results.controller";
import { InsightsController } from "./insights/insights.controller";
import { RespondentsController } from "./respondents";

const router = Router();
const controller = new SurveysController();
const resultsController = new ResultsController();
const insightsController = new InsightsController();
const respondentsController = new RespondentsController();

/** GET /api/v1/pulse/surveys/audience/options — HR only. Supervisors + teams for the audience picker. */
router.get("/audience/options", requireRole("HR"), controller.getAudienceOptions);

/** POST /api/v1/pulse/surveys/audience/preview — HR only. Resolves who would receive a survey for a given audience spec (dry run). */
router.post("/audience/preview", requireRole("HR"), controller.previewAudience);

/** GET /api/v1/pulse/surveys/occurrences/:occurrenceId/results — Returns aggregated results for an occurrence. */
router.get("/occurrences/:occurrenceId/results", resultsController.getOccurrenceResults);

/** GET /api/v1/pulse/surveys/occurrences/:occurrenceId/respondents — Authorized drill-down name
 *  list for a NAMED survey (HR/root → all; supervisor → downward chain; others → empty). */
router.get(
  "/occurrences/:occurrenceId/respondents",
  respondentsController.getRoster,
);

/** GET /api/v1/pulse/surveys/occurrences/:occurrenceId/respondents/:employeeId — One named
 *  respondent's answers. Named-only + per-target authority enforced server-side. */
router.get(
  "/occurrences/:occurrenceId/respondents/:employeeId",
  respondentsController.getIndividualAnswers,
);

/** GET /api/v1/pulse/surveys/:id/results — Returns aggregated results for a survey. */
router.get("/:id/results", resultsController.getSurveyResults);

/** POST /api/v1/pulse/surveys/:id/results/share — HR/ADMIN only (matches the results view's HR
 *  predicate). Sends a small anonymous team's results to that team's supervisor (gated:
 *  anonymous + small team + completed occurrence). */
router.post(
  "/:id/results/share",
  requireRole("HR", "ADMIN"),
  resultsController.shareSmallTeamResults,
);

/** GET /api/v1/pulse/surveys/:id/insights — AI summary of open-text responses. Visibility-gated (not role-gated). */
router.get("/:id/insights", insightsController.getSurveyInsights);

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
