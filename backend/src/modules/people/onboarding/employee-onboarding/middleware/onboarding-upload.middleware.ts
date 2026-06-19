import multer from "multer";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Accepts a single onboarding document in memory for backend Cloudinary upload. */
export const onboardingDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single("file");
