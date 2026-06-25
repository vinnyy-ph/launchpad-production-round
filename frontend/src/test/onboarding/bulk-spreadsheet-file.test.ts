import {
  MAX_BULK_SPREADSHEET_SIZE_BYTES,
  validateBulkSpreadsheetFile,
} from "@/modules/people/onboarding/constants/bulk-spreadsheet-file";

function file(bytes: number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function xlsxBytes(marker = "[Content_Types].xml"): number[] {
  const bytes = new Array<number>(128).fill(0);
  bytes[0] = 0x50;
  bytes[1] = 0x4b;
  bytes[2] = 0x03;
  bytes[3] = 0x04;

  for (let index = 0; index < marker.length; index += 1) {
    bytes[30 + index] = marker.charCodeAt(index);
  }

  return bytes;
}

describe("validateBulkSpreadsheetFile", () => {
  it("accepts a workbook with xlsx zip and OOXML markers", async () => {
    const workbook = file(
      xlsxBytes(),
      "bulk-onboarding.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await expect(validateBulkSpreadsheetFile(workbook)).resolves.toBeNull();
  });

  it("accepts generic zip MIME when the content is a real xlsx container", async () => {
    const workbook = file(xlsxBytes("xl/workbook.xml"), "bulk-onboarding.xlsx", "application/zip");

    await expect(validateBulkSpreadsheetFile(workbook)).resolves.toBeNull();
  });

  it("rejects a PDF renamed as xlsx", async () => {
    const renamedPdf = file(
      [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37],
      "bulk-onboarding.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await expect(validateBulkSpreadsheetFile(renamedPdf)).resolves.toBe(
      "The selected file does not appear to be a valid Excel workbook.",
    );
  });

  it("rejects a zip file without OOXML markers", async () => {
    const zipOnly = file(
      [0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00],
      "bulk-onboarding.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await expect(validateBulkSpreadsheetFile(zipOnly)).resolves.toBe(
      "The selected file does not appear to be a valid Excel workbook.",
    );
  });

  it("rejects non-xlsx extensions", async () => {
    const csv = file(xlsxBytes(), "bulk-onboarding.csv", "text/csv");

    await expect(validateBulkSpreadsheetFile(csv)).resolves.toBe("Upload an .xlsx file.");
  });

  it("rejects files over the size limit", async () => {
    const oversized = new File(
      [new Uint8Array([0x50, 0x4b, 0x03, 0x04])],
      "bulk-onboarding.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
    Object.defineProperty(oversized, "size", {
      value: MAX_BULK_SPREADSHEET_SIZE_BYTES + 1,
    });

    await expect(validateBulkSpreadsheetFile(oversized)).resolves.toMatch(/too large/i);
  });
});
