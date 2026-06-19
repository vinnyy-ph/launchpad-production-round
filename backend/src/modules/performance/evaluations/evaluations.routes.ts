import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { API_ERROR_CODES, HTTP_STATUS_CODES } from "../../../core/globals";
import { EvaluationsController } from "./evaluations.controller";
import { EVAL_UPLOAD_ERROR_MESSAGES } from "./evaluations.constants";
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

router.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES,
      errorCode: API_ERROR_CODES.VALIDATION_FAILED,
      errors: [{ field: "files", message: EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES, code: API_ERROR_CODES.VALIDATION_FAILED }],
    });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: EVAL_UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE,
      errorCode: API_ERROR_CODES.VALIDATION_FAILED,
      errors: [{ field: "files", message: EVAL_UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE, code: API_ERROR_CODES.VALIDATION_FAILED }],
    });
  }
  if (err.message === "Only PDF files are allowed") {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE,
      errorCode: API_ERROR_CODES.VALIDATION_FAILED,
      errors: [{ field: "files", message: EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE, code: API_ERROR_CODES.VALIDATION_FAILED }],
    });
  }
  return next(err);
});

export { router as evaluationsRouter };
