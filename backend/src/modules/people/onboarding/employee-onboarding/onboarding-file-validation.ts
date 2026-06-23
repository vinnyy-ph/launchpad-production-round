/** MIME types permitted for onboarding document uploads (multer first gate). */
export const ONBOARDING_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

type FileTypeProfile = {
  mimeTypes: readonly string[];
  matchesMagicBytes: (buffer: Buffer) => boolean;
};

const FILE_TYPE_PROFILES: Record<string, FileTypeProfile> = {
  pdf: {
    mimeTypes: ["application/pdf"],
    matchesMagicBytes: (buffer) =>
      buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF",
  },
  jpg: {
    mimeTypes: ["image/jpeg"],
    matchesMagicBytes: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  jpeg: {
    mimeTypes: ["image/jpeg"],
    matchesMagicBytes: (buffer) => FILE_TYPE_PROFILES.jpg.matchesMagicBytes(buffer),
  },
  png: {
    mimeTypes: ["image/png"],
    matchesMagicBytes: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
};

/** Parses HR-configured allowed extensions (e.g. `"pdf,jpg"`). */
export function parseAllowedExtensions(allowedFileTypes: string): string[] {
  return allowedFileTypes
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/** Coarse MIME allowlist used by multer before per-document checks in the service. */
export function isAllowedOnboardingMimeType(mimetype: string): boolean {
  const normalized = mimetype.toLowerCase().split(";")[0]?.trim() ?? "";

  return ONBOARDING_UPLOAD_MIME_TYPES.includes(
    normalized as (typeof ONBOARDING_UPLOAD_MIME_TYPES)[number],
  );
}

/**
 * Validates extension, declared MIME type, and file content (magic bytes)
 * against the document's HR-configured allowed types.
 */
export function validateOnboardingUploadFile(
  file: Pick<Express.Multer.File, "originalname" | "mimetype" | "buffer">,
  allowedFileTypes: string,
): void {
  const extension = extractExtension(file.originalname);
  const allowed = parseAllowedExtensions(allowedFileTypes);

  if (!extension || !allowed.includes(extension)) {
    throw new Error("Invalid file type");
  }

  const profile = FILE_TYPE_PROFILES[extension];

  if (!profile) {
    throw new Error("Invalid file type");
  }

  const normalizedMime = file.mimetype.toLowerCase().split(";")[0]?.trim() ?? "";

  if (!profile.mimeTypes.includes(normalizedMime)) {
    throw new Error("Invalid file type");
  }

  if (!file.buffer?.length || !profile.matchesMagicBytes(file.buffer)) {
    throw new Error("Invalid file type");
  }
}

function extractExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");

  if (dot < 0) {
    return null;
  }

  const extension = filename.slice(dot + 1).toLowerCase();

  return extension.length > 0 ? extension : null;
}
