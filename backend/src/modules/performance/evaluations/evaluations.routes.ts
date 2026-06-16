import { Router } from "express";
import { EvaluationsController } from "./evaluations.controller";

const router = Router();
const controller = new EvaluationsController();

router.post("/", controller.createEvaluation);
router.patch("/:evaluationId", controller.updateEvaluation);
router.delete("/:evaluationId", controller.deleteEvaluation);

export { router as evaluationsRouter };
