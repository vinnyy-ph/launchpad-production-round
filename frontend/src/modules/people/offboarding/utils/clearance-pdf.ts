import type { OffboardingDetail } from "../types/offboarding.types";

/**
 * Builds the Employee Exit Clearance form PDF for one offboarding case (HR action) and
 * returns it as a blob plus a suggested filename, so the caller can preview it before
 * downloading. The form mirrors the standard exit-clearance layout: employee header
 * fields, then a two-column table whose left column lists each signatory's clearance
 * (purpose + requirements) and whose right column shows the captured signature image
 * (centered) with the signatory's full name in bold uppercase beneath it.
 *
 * jsPDF + autotable are imported on demand to keep them out of the initial bundle (matches
 * the survey-results export).
 */
export async function buildClearancePdf(
  offboarding: OffboardingDetail,
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const requests = offboarding.signatureRequests;

  // Preload signature images so we know their natural dimensions when drawing into cells.
  const images = await loadSignatureImages(requests);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 16;
  const usableWidth = pageWidth - marginX * 2;

  // ── Title ───────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("EMPLOYEE EXIT CLEARANCE FORM", pageWidth / 2, 20, { align: "center" });

  // ── Header fields ─────────────────────────────────────────────────────────────
  let y = 36;
  drawField(doc, "Employee Name:", fullName(offboarding.employee), marginX, y);
  y += 9;
  drawField(doc, "Department:", offboarding.employee.department ?? "—", marginX, y);
  y += 9;
  drawField(doc, "Job Title:", offboarding.employee.jobTitle ?? "—", marginX, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Requirement prior to separation:", marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(
    "Obtain clearance and authorized signature from the following departments",
    marginX,
    y,
  );
  y += 6;

  // ── Clearance table ───────────────────────────────────────────────────────────
  const padding = 3;
  const col0Width = usableWidth * 0.5;
  const col1Width = usableWidth - col0Width;

  // Row heights: tall enough for the left text and a signature image + name on the right.
  const rowHeights = requests.map((request) =>
    Math.max(measureLeftHeight(doc, request, col0Width - padding * 2, padding), MIN_ROW_HEIGHT),
  );

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    // "grid" keeps the body plain white (no striped alternating rows) with full borders.
    theme: "grid",
    head: [["Department", "Authorized Signature"]],
    // Cells are drawn manually in didDrawCell, so body content is empty.
    body: requests.map(() => ["", ""]),
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: padding,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: col0Width },
      1: { cellWidth: col1Width },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        data.cell.styles.minCellHeight = rowHeights[data.row.index];
      }
    },
    didDrawCell: (data) => {
      if (data.section !== "body") return;
      const request = requests[data.row.index];
      if (!request) return;
      const { cell } = data;

      if (data.column.index === 0) {
        drawLeftCell(doc, request, cell.x, cell.y, cell.width, padding);
      } else {
        drawSignatureCell(doc, request, images.get(data.row.index), cell, padding);
      }
    },
  });

  return {
    blob: doc.output("blob"),
    filename: `Clearance Form - ${fullName(offboarding.employee)}.pdf`,
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Text line height (mm) used for manual wrapping at 9pt. */
const LINE_HEIGHT = 4.2;
/** Minimum row height (mm) so each signature cell has room for an image, line, and name. */
const MIN_ROW_HEIGHT = 32;

type SignatureRequest = OffboardingDetail["signatureRequests"][number];
type LoadedImage = { el: HTMLImageElement; width: number; height: number };

function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

/** Draws a "Label: value" line with a bold label and normal value. */
function drawField(
  doc: import("jspdf").jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
): void {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(label, x, y);
  const labelWidth = doc.getTextWidth(label);
  doc.setFont("helvetica", "normal");
  doc.text(value, x + labelWidth + 2, y);
}

/** Loads each request's signature image (when present) to read its natural dimensions. */
async function loadSignatureImages(
  requests: SignatureRequest[],
): Promise<Map<number, LoadedImage>> {
  const entries = await Promise.all(
    requests.map(async (request, index): Promise<[number, LoadedImage] | null> => {
      if (!request.signatureImage) return null;
      try {
        const el = await loadImage(request.signatureImage);
        return [index, { el, width: el.naturalWidth, height: el.naturalHeight }];
      } catch {
        return null;
      }
    }),
  );
  return new Map(entries.filter((entry): entry is [number, LoadedImage] => entry !== null));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load signature image"));
    img.src = src;
  });
}

/** Height (mm) needed to render the left cell's purpose (bold) + requirements (normal). */
function measureLeftHeight(
  doc: import("jspdf").jsPDF,
  request: SignatureRequest,
  textWidth: number,
  padding: number,
): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const purposeLines = doc.splitTextToSize(request.purpose, textWidth).length;
  doc.setFont("helvetica", "normal");
  const requirementLines = request.requirements
    ? doc.splitTextToSize(request.requirements, textWidth).length
    : 0;
  const gap = requirementLines > 0 ? LINE_HEIGHT * 0.6 : 0;
  return (purposeLines + requirementLines) * LINE_HEIGHT + gap + padding * 2;
}

/** Renders the purpose (bold) and requirements (normal) in the left column. */
function drawLeftCell(
  doc: import("jspdf").jsPDF,
  request: SignatureRequest,
  x: number,
  cellY: number,
  cellWidth: number,
  padding: number,
): void {
  const textWidth = cellWidth - padding * 2;
  let y = cellY + padding + LINE_HEIGHT * 0.7;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  for (const line of doc.splitTextToSize(request.purpose, textWidth)) {
    doc.text(line, x + padding, y);
    y += LINE_HEIGHT;
  }

  if (request.requirements) {
    y += LINE_HEIGHT * 0.6;
    doc.setFont("helvetica", "normal");
    for (const line of doc.splitTextToSize(request.requirements, textWidth)) {
      doc.text(line, x + padding, y);
      y += LINE_HEIGHT;
    }
  }
}

/**
 * Renders the signature image (when signed) centered above a signature line, with the
 * signatory's name centered below in bold 12pt uppercase.
 */
function drawSignatureCell(
  doc: import("jspdf").jsPDF,
  request: SignatureRequest,
  image: LoadedImage | undefined,
  cell: { x: number; y: number; width: number; height: number },
  padding: number,
): void {
  // Reserve room beneath the line for the larger (12pt) name.
  const lineY = cell.y + cell.height - 11;

  if (image) {
    const maxWidth = cell.width - padding * 2;
    const maxHeight = lineY - cell.y - padding - 1;
    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    // Center the image horizontally and vertically within the area above the line.
    const x = cell.x + (cell.width - width) / 2;
    const yTop = cell.y + padding + Math.max(0, (maxHeight - height) / 2);
    doc.addImage(image.el, "PNG", x, yTop, width, height);
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(cell.x + padding, lineY, cell.x + cell.width - padding, lineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(fullName(request.signatory).toUpperCase(), cell.x + cell.width / 2, lineY + 6, {
    align: "center",
  });
}
