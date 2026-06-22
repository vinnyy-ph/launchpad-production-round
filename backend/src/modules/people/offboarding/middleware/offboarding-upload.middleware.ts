import multer from "multer";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Accepts HR's optional offboarding attachment in memory for server-side upload. */
export const offboardingAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}).single("attachment");
