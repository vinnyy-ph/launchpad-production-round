/** Maximum bulk spreadsheet upload size (2 MB). ~200 employee rows stay well under this. */
export const MAX_BULK_SPREADSHEET_SIZE_BYTES = 2 * 1024 * 1024;

/** Keep in sync with backend `MAX_BULK_ROWS` in bulk.validation.ts */
export const MAX_BULK_SPREADSHEET_ROWS = 200;

const BULK_SPREADSHEET_EXTENSION = "xlsx";

const BULK_SPREADSHEET_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Some browsers report Office Open XML spreadsheets as generic ZIP.
  "application/zip",
] as const;

const OOXML_MARKERS = ["[Content_Types].xml", "xl/"] as const;

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function encodeAscii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index);
  }
  return bytes;
}

function containsAsciiMarker(bytes: Uint8Array, marker: string): boolean {
  const encoded = encodeAscii(marker);

  for (let index = 0; index <= bytes.length - encoded.length; index += 1) {
    if (encoded.every((value, offset) => bytes[index + offset] === value)) {
      return true;
    }
  }

  return false;
}

function matchesXlsxMagicBytes(bytes: Uint8Array): boolean {
  if (
    !startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) &&
    !startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) &&
    !startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])
  ) {
    return false;
  }

  const scanWindow = bytes.slice(0, Math.min(bytes.length, 4096));
  return OOXML_MARKERS.some((marker) => containsAsciiMarker(scanWindow, marker));
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

export function bulkSpreadsheetAcceptAttribute(): string {
  return ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

export function formatBulkSpreadsheetFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

/**
 * Validates extension, declared MIME type, size, and file content (ZIP + OOXML markers)
 * before the workbook parser runs.
 */
export async function validateBulkSpreadsheetFile(file: File): Promise<string | null> {
  if (file.size > MAX_BULK_SPREADSHEET_SIZE_BYTES) {
    return `File is too large. Maximum size is ${formatBulkSpreadsheetFileSize(MAX_BULK_SPREADSHEET_SIZE_BYTES)}.`;
  }

  const extension = fileExtension(file.name);
  if (extension !== BULK_SPREADSHEET_EXTENSION) {
    return "Upload an .xlsx file.";
  }

  const normalizedMime = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
  if (
    normalizedMime.length > 0 &&
    !BULK_SPREADSHEET_MIME_TYPES.includes(
      normalizedMime as (typeof BULK_SPREADSHEET_MIME_TYPES)[number],
    )
  ) {
    return "The selected file does not appear to be a valid Excel workbook.";
  }

  const bytes = new Uint8Array(await readBlobAsArrayBuffer(file.slice(0, 4096)));
  if (!matchesXlsxMagicBytes(bytes)) {
    return "The selected file does not appear to be a valid Excel workbook.";
  }

  return null;
}
