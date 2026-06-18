/** Maximum onboarding document upload size (5 MB). Keep in sync with backend multer limit. */
export const MAX_ONBOARDING_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Matches backend ALLOWED_FILE_EXTENSIONS in documents.constants.ts */
export const ONBOARDING_ALLOWED_FILE_TYPES = [
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "jpg", label: "JPEG (.jpg)" },
  { value: "jpeg", label: "JPEG (.jpeg)" },
  { value: "png", label: "PNG (.png)" },
] as const;

export type OnboardingAllowedFileType = (typeof ONBOARDING_ALLOWED_FILE_TYPES)[number]["value"];

export function parseAllowedFileTypes(value: string): OnboardingAllowedFileType[] {
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part): part is OnboardingAllowedFileType =>
      ONBOARDING_ALLOWED_FILE_TYPES.some((option) => option.value === part),
    );
}

export function serializeAllowedFileTypes(values: Iterable<string>): string {
  const allowed = new Set(ONBOARDING_ALLOWED_FILE_TYPES.map((option) => option.value));
  return [...new Set([...values].map((v) => v.toLowerCase()))]
    .filter((v) => allowed.has(v as OnboardingAllowedFileType))
    .join(",");
}

export function fileAcceptAttribute(allowedFileTypes: string): string {
  return parseAllowedFileTypes(allowedFileTypes)
    .map((ext) => (ext === "pdf" ? ".pdf,application/pdf" : `.${ext},image/${ext === "jpg" ? "jpeg" : ext}`))
    .join(",");
}
