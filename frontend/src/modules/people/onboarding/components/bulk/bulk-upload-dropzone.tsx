"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, Download, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Badge,
} from "@/shared/ui";
import {
  downloadBulkOnboardingTemplate,
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
  TEMPLATE_SAMPLE_ROWS,
} from "./bulk-onboarding-template";
import { BulkJobStatus } from "./bulk-job-status";
import {
  bulkSpreadsheetAcceptAttribute,
  MAX_BULK_SPREADSHEET_ROWS,
  validateBulkSpreadsheetFile,
} from "../../constants/bulk-spreadsheet-file";
import { useBulkOnboardingCommit, useBulkOnboardingPreview } from "../../hooks/use-bulk-upload";

export { OPTIONAL_COLUMNS, REQUIRED_COLUMNS, TEMPLATE_COLUMNS } from "./bulk-onboarding-template";
import type {
  BulkOnboardingCommitResult,
  BulkOnboardingPreviewResult,
  BulkOnboardingRowError,
  BulkOnboardingRowInput,
} from "../../types/onboarding.types";

interface BulkUploadDropzoneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RawSpreadsheetRow = Record<string, unknown>;

const COLUMN_ALIASES: Record<string, keyof BulkOnboardingRowInput> = {
  companyemail: "companyEmail",
  workemail: "companyEmail",
  email: "companyEmail",
  first: "firstName",
  firstname: "firstName",
  middlename: "middleName",
  middle: "middleName",
  last: "lastName",
  lastname: "lastName",
  jobtitle: "jobTitle",
  title: "jobTitle",
  department: "department",
  supervisoremail: "supervisorEmail",
  manageremail: "supervisorEmail",
  supervisorid: "supervisorId",
  supervisor: "supervisorEmail",
  personalemail: "personalEmail",
  birthday: "birthday",
  birthdate: "birthday",
  address: "address",
  streetaddress: "address",
  city: "city",
  province: "province",
  country: "country",
  emergencycontactname: "emergencyContactName",
  emergencycontact: "emergencyContact",
  emergencycontactnumber: "emergencyContact",
  emergencyphone: "emergencyContact",
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toCellString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

export function normalizeSpreadsheetRow(
  row: RawSpreadsheetRow,
  rowNumber: number,
): BulkOnboardingRowInput {
  const normalized: Partial<BulkOnboardingRowInput> = { rowNumber };

  Object.entries(row).forEach(([header, value]) => {
    const key = COLUMN_ALIASES[normalizeHeader(header)];
    if (!key || key === "rowNumber") return;

    const text = toCellString(value);
    if (text !== undefined) {
      normalized[key] = text as never;
    }
  });

  return normalized as BulkOnboardingRowInput;
}

function rowErrorCount(preview: BulkOnboardingPreviewResult | null, rowNumber: number): number {
  return preview?.errors.filter((error) => error.rowNumber === rowNumber).length ?? 0;
}

export function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    companyEmail: "Work email",
    firstName: "First name",
    lastName: "Last name",
    jobTitle: "Job title",
    department: "Department",
    supervisorId: "Supervisor email",
    supervisorEmail: "Supervisor email",
    personalEmail: "Personal email",
    birthday: "Birthday",
    emergencyContact: "Emergency contact",
    row: "Row",
  };

  return labels[field] ?? field;
}

function groupErrorsByRow(errors: BulkOnboardingRowError[]) {
  const grouped = new Map<number, BulkOnboardingRowError[]>();

  errors.forEach((error) => {
    grouped.set(error.rowNumber, [...(grouped.get(error.rowNumber) ?? []), error]);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([rowNumber, rowErrors]) => ({ rowNumber, errors: rowErrors }));
}

export function BulkUploadDropzone({ open, onOpenChange }: BulkUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewMutation = useBulkOnboardingPreview();
  const commitMutation = useBulkOnboardingCommit();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BulkOnboardingRowInput[]>([]);
  const [preview, setPreview] = useState<BulkOnboardingPreviewResult | null>(null);
  const [result, setResult] = useState<BulkOnboardingCommitResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const canCommit = rows.length > 0 && preview !== null && preview.errors.length === 0 && !result;
  const isBusy = isExtracting || previewMutation.isPending || commitMutation.isPending;
  const isDirty = Boolean(fileName || rows.length > 0 || preview || result || parseError);
  const loadingLabel = isExtracting
    ? "Extracting document"
    : previewMutation.isPending
      ? "Reviewing document"
      : null;

  const groupedErrors = useMemo(
    () => groupErrorsByRow(preview?.errors ?? []).slice(0, 6),
    [preview],
  );
  const previewRowsByNumber = useMemo(
    () => new Map((preview?.rows ?? []).map((row) => [row.rowNumber, row])),
    [preview],
  );

  function reset() {
    setFileName("");
    setRows([]);
    setPreview(null);
    setResult(null);
    setParseError(null);
    setIsExtracting(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function downloadTemplate() {
    await downloadBulkOnboardingTemplate();
  }

  async function parseFile(file: File) {
    const validationError = await validateBulkSpreadsheetFile(file);
    if (validationError) {
      setParseError(validationError);
      return;
    }

    setFileName(file.name);
    setPreview(null);
    setResult(null);
    setParseError(null);
    setIsExtracting(true);

    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
        cellFormula: false,
        cellHTML: false,
        cellStyles: false,
        bookVBA: false,
      });
      const firstSheet = workbook.SheetNames[0];

      if (!firstSheet) {
        setParseError("The workbook does not contain a sheet.");
        setIsExtracting(false);
        return;
      }

      const worksheet = workbook.Sheets[firstSheet];
      const parsed = XLSX.utils.sheet_to_json<RawSpreadsheetRow>(worksheet, {
        defval: "",
        raw: false,
      });

      const nextRows = parsed
        .map((row, index) => normalizeSpreadsheetRow(row, index + 1))
        .filter((row) =>
          Object.entries(row).some(([key, value]) => key !== "rowNumber" && Boolean(value)),
        );

      if (nextRows.length === 0) {
        setParseError("No employee rows were found in the first sheet.");
        setIsExtracting(false);
        return;
      }

      if (nextRows.length > MAX_BULK_SPREADSHEET_ROWS) {
        setParseError(`Bulk onboarding is limited to ${MAX_BULK_SPREADSHEET_ROWS} rows.`);
        setIsExtracting(false);
        return;
      }

      setRows(nextRows);
      setIsExtracting(false);
      previewMutation.mutate(nextRows, {
        onSuccess: (data) => {
          setPreview(data);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Could not preview the upload.");
        },
      });
    } catch {
      setIsExtracting(false);
      setParseError("Could not read the workbook. Check the file and try again.");
    }
  }

  function commitRows() {
    commitMutation.mutate(rows, {
      onSuccess: (data) => {
        setResult(data);
        toast.success(`${data.created.length} employees added to onboarding.`);
        reset();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Could not commit the upload.");
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isBusy) return;
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-3xl">
        {loadingLabel ? (
          <div className="absolute inset-0 z-[60] flex items-center justify-center rounded-[inherit] bg-white/85 px-6 text-center backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[color:var(--text-tertiary)]" />
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                {loadingLabel}
              </p>
              <p className="mt-1 max-w-[280px] text-xs text-[color:var(--text-tertiary)]">
                {isExtracting
                  ? "Reading the workbook and preparing the rows."
                  : "Checking the uploaded rows for duplicates, supervisor matches, and other issues."}
              </p>
            </div>
          </div>
        ) : null}
        <DialogHeader>
          <DialogTitle>Bulk onboarding</DialogTitle>
          <DialogDescription>
            Upload an .xlsx with one employee per row. Rows are validated before anything is
            created.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-[color:var(--border-primary)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                Start with the template
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                It includes the required columns and {TEMPLATE_SAMPLE_ROWS.length} sample rows.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => void downloadTemplate()}
            >
              <Download aria-hidden="true" />
              Download template
            </Button>
          </div>

          <button
            type="button"
            className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-4 py-8 text-center transition hover:bg-white"
            onClick={() => inputRef.current?.click()}
            onDrop={(event) => {
              event.preventDefault();
              if (isBusy) return;
              const file = event.dataTransfer.files[0];
              if (file) void parseFile(file);
            }}
            onDragOver={(event) => event.preventDefault()}
            disabled={isBusy}
          >
            {loadingLabel ? (
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[color:var(--text-tertiary)]" />
            ) : (
              <UploadCloud className="mb-3 h-8 w-8 text-[color:var(--text-tertiary)]" />
            )}
            <span className="text-sm font-semibold text-[color:var(--text-primary)]">
              {loadingLabel ? `${loadingLabel}...` : fileName || "Choose or drop an .xlsx file"}
            </span>
            <span className="mt-1 max-w-full break-words text-xs text-[color:var(--text-tertiary)]">
              {loadingLabel
                ? loadingLabel === "Extracting document"
                  ? "Reading the workbook and preparing the rows."
                  : "Checking the uploaded rows for issues."
                : `Required columns: ${REQUIRED_COLUMNS.join(", ")}`}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={bulkSpreadsheetAcceptAttribute()}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void parseFile(file);
            }}
          />

          {parseError ? (
            <p className="rounded-lg border border-[color:var(--color-error-200)] bg-[color:var(--color-error-50)] px-3 py-2 text-sm text-[color:var(--color-error-700)]">
              {parseError}
            </p>
          ) : null}

          <BulkJobStatus preview={preview} result={result} />

          {rows.length > 0 ? (
            <div className="min-w-0 rounded-lg border border-[color:var(--border-primary)]">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-[color:var(--bg-secondary)] text-xs text-[color:var(--text-tertiary)]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Row</th>
                      <th className="px-3 py-2 font-semibold">Employee</th>
                      <th className="px-3 py-2 font-semibold">Work email</th>
                      <th className="px-3 py-2 font-semibold">Job title</th>
                      <th className="px-3 py-2 font-semibold">Department</th>
                      <th className="px-3 py-2 font-semibold">Supervisor</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border-primary)] bg-white">
                    {rows.slice(0, 10).map((row) => {
                      const errors = rowErrorCount(preview, row.rowNumber);
                      const previewRow = previewRowsByNumber.get(row.rowNumber);
                      return (
                        <tr key={row.rowNumber}>
                          <td className="px-3 py-2 text-[color:var(--text-tertiary)]">
                            {row.rowNumber}
                          </td>
                          <td className="px-3 py-2 text-[color:var(--text-primary)]">
                            {[row.firstName, row.lastName].filter(Boolean).join(" ") || "-"}
                          </td>
                          <td className="px-3 py-2 text-[color:var(--text-secondary)]">
                            {row.companyEmail ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-[color:var(--text-secondary)]">
                            {row.jobTitle ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-[color:var(--text-secondary)]">
                            {row.department ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-[color:var(--text-secondary)]">
                            {previewRow?.supervisorName ? (
                              <span className="flex flex-col">
                                <span className="font-medium text-[color:var(--text-primary)]">
                                  {previewRow.supervisorName}
                                </span>
                                <span className="text-xs text-[color:var(--text-tertiary)]">
                                  {previewRow.supervisorEmail}
                                </span>
                              </span>
                            ) : row.supervisorEmail ? (
                              <span className="flex flex-col">
                                <span className="font-medium text-[color:var(--color-error-700)]">
                                  Supervisor not found
                                </span>
                                <span className="text-xs text-[color:var(--color-error-900)]">
                                  {row.supervisorEmail}
                                </span>
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                errors > 0
                                  ? "bg-[color:var(--color-error-50)] text-[color:var(--color-error-700)]"
                                  : "bg-[color:var(--color-success-50)] text-[#027A48]"
                              }`}
                            >
                              {errors > 0 ? `${errors} error${errors === 1 ? "" : "s"}` : "Valid"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 10 ? (
                <p className="border-t border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-3 py-2 text-xs text-[color:var(--text-tertiary)]">
                  Showing first 10 of {rows.length} rows.
                </p>
              ) : null}
            </div>
          ) : null}

          {groupedErrors.length > 0 && preview ? (
            <div className="min-w-0 rounded-lg border border-[color:var(--color-error-200)] bg-[#FFFBFA]">
              <div className="flex flex-col gap-2 border-b border-[color:var(--color-error-200)] bg-[color:var(--color-error-50)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[color:var(--color-error-700)]" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--color-error-700)]">
                      Fix {preview.invalidRows} row{preview.invalidRows === 1 ? "" : "s"} before
                      commit
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-error-900)]">
                      Update the spreadsheet, then upload it again for a fresh validation pass.
                    </p>
                  </div>
                </div>
                <Badge variant="error" pill className="font-semibold">
                  {preview.errors.length} issue{preview.errors.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="max-h-[260px] space-y-2 overflow-y-auto p-3">
                {groupedErrors.map((group) => (
                  <div
                    key={group.rowNumber}
                    className="rounded-md border border-[color:var(--color-error-200)] bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                        Row {group.rowNumber}
                      </p>
                      <Badge variant="error" pill className="font-semibold">
                        {group.errors.length} issue{group.errors.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {group.errors.map((error, index) => (
                        <div
                          key={`${error.rowNumber}-${error.field}-${index}`}
                          className="flex flex-col gap-1 text-xs sm:flex-row sm:items-start"
                        >
                          <Badge variant="error" pill className="w-fit font-semibold">
                            {fieldLabel(error.field)}
                          </Badge>
                          <span className="min-w-0 break-words text-[color:var(--color-error-900)]">
                            {error.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {preview.invalidRows > groupedErrors.length ? (
                <p className="border-t border-[color:var(--color-error-200)] bg-white px-3 py-2 text-xs text-[color:var(--color-error-900)]">
                  Showing first {groupedErrors.length} rows with issues. The full file has{" "}
                  {preview.invalidRows} invalid rows.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="min-w-0 rounded-lg border border-[color:var(--border-primary)] bg-white p-3">
            <div className="flex min-w-0 items-start gap-2">
              <FileSpreadsheet className="mt-0.5 h-4 w-4 text-[color:var(--text-tertiary)]" />
              <p className="min-w-0 break-words text-xs text-[color:var(--text-tertiary)]">
                Optional pre-fill columns: {OPTIONAL_COLUMNS.join(", ")}.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:flex-wrap sm:space-x-0">
          {isDirty ? (
            <Button type="button" variant="secondary" disabled={isBusy} onClick={reset}>
              Clear
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={isBusy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}
          <Button type="button" disabled={!canCommit || isBusy} onClick={commitRows}>
            {commitMutation.isPending ? "Creating..." : "Create records and send invites"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
