import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { API_ERROR_CODES, HTTP_STATUS_CODES } from "../../../core/globals";
import { requireRole } from "../../../core/middleware/roles.middleware";
import { OffboardingController } from "./offboarding.controller";
import { offboardingAttachmentUpload } from "./middleware/offboarding-upload.middleware";

const offboardingController = new OffboardingController();

export const offboardingRouter = Router();

/** Initiate offboarding for an employee. ADMIN/HR only. */
offboardingRouter.post(
  "/",
  requireRole("ADMIN", "HR"),
  offboardingAttachmentUpload,
  offboardingController.initiateOffboarding,
);

offboardingRouter.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  // Map multer upload rejections to a consistent 400 validation envelope.
  const uploadErrorMessage =
    err.code === "LIMIT_FILE_SIZE"
      ? "Each attachment must be 5 MB or smaller"
      : err.code === "LIMIT_FILE_COUNT"
        ? "You can upload at most 10 attachments"
        : err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Unexpected attachment field"
          : err.message === "Invalid file type"
            ? "Attachments must be PNG, JPG, or PDF files"
            : null;

  if (uploadErrorMessage) {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: uploadErrorMessage,
      errorCode: API_ERROR_CODES.VALIDATION_FAILED,
      errors: [
        {
          field: "attachments",
          message: uploadErrorMessage,
          code: API_ERROR_CODES.VALIDATION_FAILED,
        },
      ],
    });
  }

  return next(err);
});

/** List offboarding records — all for ADMIN/HR, downward-chain scoped for supervisors. */
offboardingRouter.get("/", offboardingController.listOffboardings);

/** The caller's own offboarding record (offboardee self-view). Declared before /:id. */
offboardingRouter.get("/me", offboardingController.getMyOffboarding);

/** Offboarding detail. Authorized for ADMIN/HR, the offboardee, or a signatory. */
offboardingRouter.get("/:id", offboardingController.getOffboardingById);

/** Reassign the offboardee's direct reports and team leadership. ADMIN/HR only. */
offboardingRouter.post(
  "/:id/reassign",
  requireRole("ADMIN", "HR"),
  offboardingController.reassignReports,
);
