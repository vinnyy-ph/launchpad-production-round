
import type { ParsedBulkOnboardingRows } from "./bulk.types";
import { OnboardingValidation } from "../onboarding.validation";

const MAX_BULK_ROWS = 200;

export class BulkOnboardingValidation {
  constructor(private readonly onboardingValidation = new OnboardingValidation()) {}

  parseRows(body: Record<string, unknown>): ParsedBulkOnboardingRows {
    if (!Array.isArray(body.rows)) {
      throw new Error("rows is required");
    }

    if (body.rows.length === 0) {
      throw new Error("At least one row is required");
    }

    if (body.rows.length > MAX_BULK_ROWS) {
      throw new Error(`Bulk onboarding is limited to ${MAX_BULK_ROWS} rows`);
    }

    const rows: ParsedBulkOnboardingRows["rows"] = [];
    const errors: ParsedBulkOnboardingRows["errors"] = [];

    body.rows.forEach((row, index) => {
      const rowNumber = this.resolveRowNumber(row, index);

      if (!row || typeof row !== "object") {
        errors.push({
          rowNumber,
          field: "row",
          message: "Row is invalid.",
        });
        return;
      }

      const rawRow = row as Record<string, unknown>;
      try {
        const parsed = this.onboardingValidation.parseOnboardBody(rawRow);
        rows.push({ ...parsed, rowNumber });
      } catch (error) {
        errors.push({
          rowNumber,
          field: this.resolveErrorField(error),
          message: error instanceof Error ? error.message : "Row is invalid.",
        });
      }
    });

    return { totalRows: body.rows.length, rows, errors };
  }

  private resolveRowNumber(row: unknown, index: number): number {
    if (row && typeof row === "object") {
      const rowNumber = (row as Record<string, unknown>).rowNumber;
      if (typeof rowNumber === "number" && Number.isFinite(rowNumber)) {
        return rowNumber;
      }
    }

    return index + 2;
  }

  private resolveErrorField(error: unknown): string {
    if (!(error instanceof Error)) {
      return "row";
    }

    if (error.message.endsWith(" is required")) {
      return error.message.replace(" is required", "");
    }

    if (error.message === "Invalid birthday") {
      return "birthday";
    }

    if (error.message === "Invalid emergency contact phone number") {
      return "emergencyContact";
    }

    return "row";
  }
}
