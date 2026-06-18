import { Router } from "express";
import { EvaluationsController } from "./evaluations.controller";

const router = Router();
const controller = new EvaluationsController();

router.get("/", controller.listEvaluations);
router.get("/:evaluationId", controller.getEvaluation);
router.post("/", controller.createEvaluation);
router.patch("/:evaluationId/send", controller.sendEvaluation);
router.patch("/:evaluationId/acknowledge", controller.acknowledgeEvaluation);
router.patch("/:evaluationId", controller.updateEvaluation);
router.delete("/:evaluationId", controller.deleteEvaluation);

export { router as evaluationsRouter };
