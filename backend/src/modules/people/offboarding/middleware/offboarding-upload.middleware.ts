import multer from "multer";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** MIME types permitted for offboarding attachments (multer first gate). */
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

/** Accepts HR's optional offboarding attachment in memory for server-side upload. */
export const offboardingAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const mimeType = file.mimetype.toLowerCase().split(";")[0]?.trim() ?? "";
    if (ALLOWED_MIME_TYPES.includes(mimeType)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
}).single("attachment");
