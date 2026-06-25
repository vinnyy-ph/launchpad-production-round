import multer from "multer";
import { isAllowedEvaluationMimeType } from "../evaluation-file-validation";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_COUNT = 5;

export const evaluationDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILE_COUNT },
  fileFilter: (_req, file, cb) => {
    if (isAllowedEvaluationMimeType(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only PDF files are allowed"));
  },
}).array("files", MAX_FILE_COUNT);
