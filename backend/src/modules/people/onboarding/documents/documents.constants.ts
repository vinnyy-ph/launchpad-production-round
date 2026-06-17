/**
 * Field names used in required-documents validation error responses.
 */
export const DOCUMENT_FIELDS = {
  ID: "id",
  DOCUMENT_NAME: "documentName",
  INSTRUCTIONS: "instructions",
  ALLOWED_FILE_TYPES: "allowedFileTypes",
  IS_REQUIRED: "isRequired",
} as const;

/** File extensions HR may allow for onboarding document uploads. */
export const ALLOWED_FILE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"] as const;

/** Default onboarding template name when none exists yet. */
export const DEFAULT_TEMPLATE_NAME = "Default";
