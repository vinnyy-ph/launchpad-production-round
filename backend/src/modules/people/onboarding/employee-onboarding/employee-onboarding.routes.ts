import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import { requireRole } from "../../../../core/middleware/roles.middleware";
import { EmployeeOnboardingController } from "./employee-onboarding.controller";
import { EMPLOYEE_ONBOARDING_FIELDS } from "./employee-onboarding.constants";
import { onboardingDocumentUpload } from "./middleware/onboarding-upload.middleware";

const employeeOnboardingController = new EmployeeOnboardingController();

export const employeeOnboardingRouter = Router();

/** Employee only — accept the onboarding invitation. */
employeeOnboardingRouter.post(
  "/accept-invitation",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.acceptInvitation,
);

/** Employee only — view onboarding checklist and progress. */
employeeOnboardingRouter.get(
  "/status",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.getStatus,
);

/** Employee only — confirm or edit pre-filled profile data. */
employeeOnboardingRouter.patch(
  "/profile",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.updateProfile,
);

/** Employee only — submit custom field answers. */
employeeOnboardingRouter.post(
  "/custom-fields",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.submitCustomFields,
);

/** Employee only — upload or re-upload a required document (multipart file → Cloudinary). */
employeeOnboardingRouter.post(
  "/documents/:documentId/submit",
  requireRole("EMPLOYEE"),
  onboardingDocumentUpload,
  employeeOnboardingController.submitDocument,
);

/** Employee only — mark onboarding complete. */
employeeOnboardingRouter.post(
  "/complete",
  requireRole("EMPLOYEE"),
  employeeOnboardingController.completeOnboarding,
);

employeeOnboardingRouter.use(
  (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof Error && err.message === "Invalid file type") {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.INVALID_FILE_TYPE,
        errorCode: API_ERROR_CODES.INVALID_FILE_TYPE,
        errors: [
          {
            field: EMPLOYEE_ONBOARDING_FIELDS.FILE,
            message: API_ERROR_MESSAGES.INVALID_FILE_TYPE,
            code: API_ERROR_CODES.INVALID_FILE_TYPE,
          },
        ],
      });
    }

    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "LIMIT_FILE_SIZE"
    ) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.VALIDATION_FAILED,
        errorCode: API_ERROR_CODES.VALIDATION_FAILED,
        errors: [
          {
            field: EMPLOYEE_ONBOARDING_FIELDS.FILE,
            message: "File exceeds the 5 MB upload limit",
            code: API_ERROR_CODES.VALIDATION_FAILED,
          },
        ],
      });
    }

    return next(err);
  },
);
