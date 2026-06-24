import {
  formatOnboardingDocumentStorageKey,
  isLegacyOnboardingDocumentUrl,
  parseLegacyCloudinaryDocumentUrl,
  parseOnboardingDocumentStorageKey,
} from "./onboarding-document-storage";

describe("onboarding-document-storage", () => {
  it("formats and parses a storage key", () => {
    const key = formatOnboardingDocumentStorageKey("onboarding/nbi-clearance", "image");

    expect(key).toBe("onboarding/nbi-clearance|image");
    expect(parseOnboardingDocumentStorageKey(key)).toEqual({
      publicId: "onboarding/nbi-clearance",
      resourceType: "image",
    });
  });

  it("detects legacy public URLs", () => {
    expect(
      isLegacyOnboardingDocumentUrl(
        "https://res.cloudinary.com/demo/image/upload/v1/onboarding/nbi.pdf",
      ),
    ).toBe(true);
    expect(isLegacyOnboardingDocumentUrl("onboarding/nbi-clearance|image")).toBe(
      false,
    );
  });

  it("defaults bare public IDs to image resource type", () => {
    expect(parseOnboardingDocumentStorageKey("onboarding/legacy-id")).toEqual({
      publicId: "onboarding/legacy-id",
      resourceType: "image",
    });
  });

  it("parses legacy Cloudinary image delivery URLs", () => {
    expect(
      parseLegacyCloudinaryDocumentUrl(
        "https://res.cloudinary.com/demo/image/upload/v1710000000/onboarding/id-card.jpg",
      ),
    ).toEqual({
      publicId: "onboarding/id-card",
      resourceType: "image",
    });
  });

  it("parses legacy Cloudinary raw delivery URLs", () => {
    expect(
      parseLegacyCloudinaryDocumentUrl(
        "https://res.cloudinary.com/demo/raw/upload/v1710000000/onboarding/nbi-clearance.pdf",
      ),
    ).toEqual({
      publicId: "onboarding/nbi-clearance.pdf",
      resourceType: "raw",
    });
  });

  it("returns null for non-Cloudinary legacy URLs", () => {
    expect(
      parseLegacyCloudinaryDocumentUrl(
        "https://storage.example.com/onboarding/nbi-clearance.pdf",
      ),
    ).toBeNull();
  });
});
