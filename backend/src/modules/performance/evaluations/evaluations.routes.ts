import { Router } from "express";
import { EvaluationsController } from "./evaluations.controller";

const router = Router();
const controller = new EvaluationsController();

router.post("/", controller.createEvaluation);

export { router as evaluationsRouter };
