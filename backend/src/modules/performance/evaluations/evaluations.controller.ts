import type { NextFunction, Request, Response } from "express";
import { validateCreateEvaluation } from "./evaluations.validation";
import { handleCreateEvaluation } from "./evaluations.service";

export async function createEvaluation(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validateCreateEvaluation(req.body);
    const evaluation = await handleCreateEvaluation(input);
    return res.status(201).json({ data: evaluation });
  } catch (error) {
    return next(error);
  }
}
