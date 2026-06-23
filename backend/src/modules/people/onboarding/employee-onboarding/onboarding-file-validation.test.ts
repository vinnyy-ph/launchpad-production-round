import {
  isAllowedOnboardingMimeType,
  validateOnboardingUploadFile,
} from "./onboarding-file-validation";

const PDF_BUFFER = Buffer.from("%PDF-1.4 fake pdf content");
const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);

describe("onboarding-file-validation", () => {
  describe("isAllowedOnboardingMimeType", () => {
    it("accepts pdf and image MIME types", () => {
      expect(isAllowedOnboardingMimeType("application/pdf")).toBe(true);
      expect(isAllowedOnboardingMimeType("image/jpeg")).toBe(true);
      expect(isAllowedOnboardingMimeType("image/png")).toBe(true);
    });

    it("rejects executable MIME types", () => {
      expect(isAllowedOnboardingMimeType("application/x-msdownload")).toBe(false);
      expect(isAllowedOnboardingMimeType("application/octet-stream")).toBe(false);
    });
  });

  describe("validateOnboardingUploadFile", () => {
    it("accepts a valid PDF", () => {
      expect(() =>
        validateOnboardingUploadFile(
          {
            originalname: "nbi-clearance.pdf",
            mimetype: "application/pdf",
            buffer: PDF_BUFFER,
          },
          "pdf",
        ),
      ).not.toThrow();
    });

    it("rejects a disallowed extension", () => {
      expect(() =>
        validateOnboardingUploadFile(
          {
            originalname: "malware.exe",
            mimetype: "application/pdf",
            buffer: PDF_BUFFER,
          },
          "pdf",
        ),
      ).toThrow("Invalid file type");
    });

    it("rejects a MIME type that does not match the extension", () => {
      expect(() =>
        validateOnboardingUploadFile(
          {
            originalname: "nbi-clearance.pdf",
            mimetype: "image/png",
            buffer: PDF_BUFFER,
          },
          "pdf",
        ),
      ).toThrow("Invalid file type");
    });

    it("rejects content whose magic bytes do not match the extension", () => {
      expect(() =>
        validateOnboardingUploadFile(
          {
            originalname: "nbi-clearance.pdf",
            mimetype: "application/pdf",
            buffer: Buffer.from("MZ fake executable"),
          },
          "pdf",
        ),
      ).toThrow("Invalid file type");
    });

    it("accepts JPEG and PNG when allowed", () => {
      expect(() =>
        validateOnboardingUploadFile(
          {
            originalname: "government-id.jpg",
            mimetype: "image/jpeg",
            buffer: JPEG_BUFFER,
          },
          "pdf,jpg,png",
        ),
      ).not.toThrow();

      expect(() =>
        validateOnboardingUploadFile(
          {
            originalname: "government-id.png",
            mimetype: "image/png",
            buffer: PNG_BUFFER,
          },
          "pdf,jpg,png",
        ),
      ).not.toThrow();
    });
  });
});
