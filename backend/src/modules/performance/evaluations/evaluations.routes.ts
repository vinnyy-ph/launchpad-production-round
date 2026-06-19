import { Router } from "express";
import { EvaluationsController } from "./evaluations.controller";
import { evaluationDocumentUpload } from "./middleware/evaluation-upload.middleware";

const router = Router();
const controller = new EvaluationsController();

router.get("/", controller.listEvaluations);
router.get("/reviewees", controller.listReviewees);
router.get("/:evaluationId", controller.getEvaluation);
router.post("/", evaluationDocumentUpload, controller.createEvaluation);
router.patch("/:evaluationId/send", controller.sendEvaluation);
router.patch("/:evaluationId/acknowledge", controller.acknowledgeEvaluation);
router.patch("/:evaluationId", evaluationDocumentUpload, controller.updateEvaluation);
router.delete("/:evaluationId", controller.deleteEvaluation);

export { router as evaluationsRouter };
