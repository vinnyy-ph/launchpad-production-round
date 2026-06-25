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

const FILE_SIGNATURE_LABELS: Record<OnboardingAllowedFileType, string> = {
  pdf: "PDF",
  jpg: "JPEG",
  jpeg: "JPEG",
  png: "PNG",
};

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

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function containsPdfHeader(bytes: Uint8Array): boolean {
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d];
  for (let index = 0; index <= bytes.length - signature.length; index += 1) {
    if (signature.every((value, offset) => bytes[index + offset] === value)) return true;
  }
  return false;
}

function fileMatchesSignature(fileType: OnboardingAllowedFileType, bytes: Uint8Array): boolean {
  switch (fileType) {
    case "pdf":
      return containsPdfHeader(bytes);
    case "jpg":
    case "jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsArrayBuffer(blob);
  });
}

export async function validateOnboardingFile(
  file: File,
  allowed: OnboardingAllowedFileType[],
): Promise<string | null> {
  if (file.size > MAX_ONBOARDING_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is ${formatOnboardingFileSize(MAX_ONBOARDING_FILE_SIZE_BYTES)}.`;
  }

  const ext = fileExtension(file.name);
  if (!allowed.includes(ext as OnboardingAllowedFileType)) {
    return `This file type is not allowed. Use: ${allowed.join(", ")}.`;
  }

  const fileType = ext as OnboardingAllowedFileType;
  const bytes = new Uint8Array(await readBlobAsArrayBuffer(file.slice(0, 1024)));
  if (!fileMatchesSignature(fileType, bytes)) {
    return `The selected file does not appear to be a valid ${FILE_SIGNATURE_LABELS[fileType]} file.`;
  }

  return null;
}

export function formatOnboardingFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}
