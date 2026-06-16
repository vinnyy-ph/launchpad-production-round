import { Router } from "express";
import { createEvaluation } from "./evaluations.controller";

const router = Router();

// TODO: add authenticate middleware once Firebase is set up
router.post("/", createEvaluation);

export { router as evaluationsRouter };
