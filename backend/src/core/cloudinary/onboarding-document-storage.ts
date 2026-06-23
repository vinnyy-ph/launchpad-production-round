const STORAGE_KEY_SEPARATOR = "|";

/** True when the DB value is a legacy public Cloudinary HTTPS URL. */
export function isLegacyOnboardingDocumentUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
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
  const separatorIndex = value.lastIndexOf(STORAGE_KEY_SEPARATOR);

  if (separatorIndex === -1) {
    return { publicId: value, resourceType: "image" };
  }

  return {
    publicId: value.slice(0, separatorIndex),
    resourceType: value.slice(separatorIndex + 1),
  };
}
