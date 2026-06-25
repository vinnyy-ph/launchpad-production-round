import multer from "multer";
import { isAllowedOnboardingMimeType } from "../onboarding-file-validation";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Accepts a single onboarding document in memory for backend Cloudinary upload. */
export const onboardingDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (isAllowedOnboardingMimeType(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Invalid file type"));
  },
}).single("file");
