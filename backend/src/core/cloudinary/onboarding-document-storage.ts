const STORAGE_KEY_SEPARATOR = "|";
const CLOUDINARY_HOST = "res.cloudinary.com";

const CLOUDINARY_RESOURCE_TYPES = new Set(["image", "raw", "video"]);

/** True when the DB value is a legacy public Cloudinary HTTPS URL. */
export function isLegacyOnboardingDocumentUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

/** Converts legacy Cloudinary delivery URLs into the private storage key format. */
export function parseLegacyCloudinaryDocumentUrl(value: string): {
  publicId: string;
  resourceType: string;
} | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.hostname !== CLOUDINARY_HOST) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const resourceType = parts[1];

  if (!CLOUDINARY_RESOURCE_TYPES.has(resourceType)) {
    return null;
  }

  const versionIndex = parts.findIndex((part, index) => {
    return index > 2 && /^v\d+$/.test(part);
  });
  const publicIdStart = versionIndex === -1 ? 3 : versionIndex + 1;
  const publicPath = parts.slice(publicIdStart).join("/");

  if (!publicPath) {
    return null;
  }

  const publicId =
    resourceType === "raw"
      ? publicPath
      : publicPath.replace(/\.[^/.]+$/, "");

  return { publicId, resourceType };
}

/** Persists Cloudinary `public_id` and `resource_type` in the existing `fileUrl` column. */
export function formatOnboardingDocumentStorageKey(
  publicId: string,
  resourceType: string,
): string {
  return `${publicId}${STORAGE_KEY_SEPARATOR}${resourceType}`;
}

/** Parses a stored onboarding document reference. Bare public IDs default to `image`. */
export function parseOnboardingDocumentStorageKey(value: string): {
  publicId: string;
  resourceType: string;
} {
  const legacyCloudinaryDocument = parseLegacyCloudinaryDocumentUrl(value);
  if (legacyCloudinaryDocument) {
    return legacyCloudinaryDocument;
  }

  const separatorIndex = value.lastIndexOf(STORAGE_KEY_SEPARATOR);

  if (separatorIndex === -1) {
    return { publicId: value, resourceType: "image" };
  }

  return {
    publicId: value.slice(0, separatorIndex),
    resourceType: value.slice(separatorIndex + 1),
  };
}
