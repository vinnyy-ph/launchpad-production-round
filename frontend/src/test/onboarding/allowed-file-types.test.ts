import {
  parseAllowedFileTypes,
  validateOnboardingFile,
} from "@/modules/people/onboarding/constants/allowed-file-types";

function file(bytes: number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("validateOnboardingFile", () => {
  const pdfOnly = parseAllowedFileTypes("pdf");

  it("accepts a real PDF file for a PDF-only document", async () => {
    const realPdf = file([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37], "contract.pdf", "application/pdf");

    await expect(validateOnboardingFile(realPdf, pdfOnly)).resolves.toBeNull();
  });

  it("rejects a JPEG renamed as a PDF for a PDF-only document", async () => {
    const renamedJpeg = file([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "id.pdf", "application/pdf");

    await expect(validateOnboardingFile(renamedJpeg, pdfOnly)).resolves.toBe(
      "The selected file does not appear to be a valid PDF file.",
    );
  });

  it("rejects a PDF renamed as a JPEG", async () => {
    const renamedPdf = file([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37], "id.jpeg", "image/jpeg");

    await expect(validateOnboardingFile(renamedPdf, parseAllowedFileTypes("jpeg"))).resolves.toBe(
      "The selected file does not appear to be a valid JPEG file.",
    );
  });
});
