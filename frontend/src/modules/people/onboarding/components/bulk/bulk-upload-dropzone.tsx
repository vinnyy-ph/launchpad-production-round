"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useAllEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useDepartments } from "@/modules/people/departments/hooks/use-departments";
import {
  PEOPLE_NAME_LANGUAGE_MESSAGE,
  PEOPLE_TEXT_LIMITS,
  validatePeopleNameLanguage,
  validatePeopleText,
} from "@/modules/people/people-text";
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FileUploadBox,
  FileUploadChip,
} from "@/shared/ui";
import {
  downloadBulkOnboardingTemplate,
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
  TEMPLATE_SAMPLE_ROWS,
} from "./bulk-onboarding-template";
import { BulkJobStatus } from "./bulk-job-status";
import { BulkPreviewTable } from "./bulk-preview-table";
import {
  bulkSpreadsheetAcceptAttribute,
  formatBulkSpreadsheetFileSize,
  MAX_BULK_SPREADSHEET_ROWS,
  validateBulkSpreadsheetFile,
} from "../../constants/bulk-spreadsheet-file";
import { useBulkOnboardingCommit, useBulkOnboardingPreview } from "../../hooks/use-bulk-upload";

export {
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
  TEMPLATE_COLUMNS,
  TEMPLATE_SAMPLE_ROWS,
} from "./bulk-onboarding-template";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQUIRED_LIVE_FIELDS = [
  ["companyEmail", "Work email", PEOPLE_TEXT_LIMITS.EMAIL],
  ["firstName", "First name", PEOPLE_TEXT_LIMITS.NAME],
  ["lastName", "Last name", PEOPLE_TEXT_LIMITS.NAME],
  ["jobTitle", "Job title", PEOPLE_TEXT_LIMITS.JOB_TITLE],
  ["department", "Department", PEOPLE_TEXT_LIMITS.DEPARTMENT_NAME],
] as const satisfies ReadonlyArray<
  readonly [keyof BulkOnboardingRowInput, string, number]
>;

const OPTIONAL_LIVE_FIELDS = [
  ["middleName", "Middle name", PEOPLE_TEXT_LIMITS.NAME],
  ["personalEmail", "Personal email", PEOPLE_TEXT_LIMITS.EMAIL],
  ["address", "Street address", PEOPLE_TEXT_LIMITS.ADDRESS_LINE],
  ["city", "City", PEOPLE_TEXT_LIMITS.LOCATION],
  ["province", "Province", PEOPLE_TEXT_LIMITS.LOCATION],
  ["country", "Country", PEOPLE_TEXT_LIMITS.LOCATION],
  ["emergencyContactName", "Emergency contact name", PEOPLE_TEXT_LIMITS.NAME],
  ["emergencyContact", "Emergency contact", PEOPLE_TEXT_LIMITS.PHONE_DISPLAY],
] as const satisfies ReadonlyArray<
  readonly [keyof BulkOnboardingRowInput, string, number]
>;

const BULK_FIELD_MESSAGES: Partial<Record<keyof BulkOnboardingRowInput, string>> = {
  companyEmail: "Please enter a valid work email address.",
  firstName: "Please enter a valid first name using letters only.",
  middleName: "Please enter a valid middle name using letters only.",
  lastName: "Please enter a valid last name using letters only.",
  jobTitle:
    "Please enter a valid job title using letters, numbers, spaces, and common punctuation only.",
  personalEmail: "Please enter a valid personal email address.",
  address:
    "Please enter a valid street address using letters, numbers, and standard address characters only.",
  emergencyContactName: "Please enter a valid contact name using letters only.",
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

export function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    companyEmail: "Work email",
    firstName: "First name",
    lastName: "Last name",
    jobTitle: "Job title",
    department: "Department",
    supervisorId: "Supervisor",
    supervisorEmail: "Supervisor",
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

function friendlyFieldMessage(field: string, fallback: string): string {
  return BULK_FIELD_MESSAGES[field as keyof BulkOnboardingRowInput] ?? fallback;
}

function displayBulkError(error: BulkOnboardingRowError): BulkOnboardingRowError {
  if (
    error.message.includes("must not contain HTML") ||
    error.message.includes("must not contain HTML or control characters")
  ) {
    return {
      ...error,
      message: friendlyFieldMessage(error.field, error.message),
    };
  }

  if (
    error.message === `Invalid ${error.field}` ||
    error.message === "Invalid companyEmail" ||
    error.message === "Invalid personalEmail" ||
    error.message === "Invalid supervisorEmail"
  ) {
    return {
      ...error,
      message: friendlyFieldMessage(error.field, error.message),
    };
  }

  return error;
}

function liveTextError(
  value: unknown,
  field: keyof BulkOnboardingRowInput,
  label: string,
  maxLen: number,
  required: boolean,
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return required ? `${label} is required.` : undefined;
  }

  if (typeof value !== "string") {
    return `Invalid ${field}`;
  }

  if (value.trim().length === 0) {
    return required ? `${label} cannot be empty spaces.` : undefined;
  }

  const trimmed = value.trim();
  const languageError = validatePeopleNameLanguage(trimmed);
  if (languageError) return PEOPLE_NAME_LANGUAGE_MESSAGE;

  const textError = validatePeopleText(trimmed, label, maxLen);
  if (textError?.includes("must not contain HTML")) {
    return friendlyFieldMessage(field, textError);
  }
  return textError;
}

function validateLiveBulkRows(rows: BulkOnboardingRowInput[]): BulkOnboardingRowError[] {
  return rows.flatMap((row) => {
    const errors: BulkOnboardingRowError[] = [];

    for (const [field, label, maxLen] of REQUIRED_LIVE_FIELDS) {
      const message = liveTextError(row[field], field, label, maxLen, true);
      if (message) errors.push({ rowNumber: row.rowNumber, field, message });
    }

    const supervisorValue = row.supervisorEmail ?? row.supervisorId;
    if (!row.supervisorEmail?.trim() && !row.supervisorId?.trim()) {
      errors.push({
        rowNumber: row.rowNumber,
        field: row.supervisorEmail !== undefined ? "supervisorEmail" : "supervisorId",
        message:
          typeof supervisorValue === "string" && supervisorValue.length > 0
            ? "Supervisor cannot be empty spaces."
            : "Supervisor is required.",
      });
    } else if (row.supervisorEmail) {
      const message = liveTextError(
        row.supervisorEmail,
        "supervisorEmail",
        "Supervisor",
        PEOPLE_TEXT_LIMITS.EMAIL,
        false,
      );
      if (message) {
        errors.push({ rowNumber: row.rowNumber, field: "supervisorEmail", message });
      } else if (!EMAIL_RE.test(row.supervisorEmail.trim())) {
        errors.push({ rowNumber: row.rowNumber, field: "supervisorEmail", message: "Invalid supervisorEmail" });
      }
    }

    for (const [field, label, maxLen] of OPTIONAL_LIVE_FIELDS) {
      const message = liveTextError(row[field], field, label, maxLen, false);
      if (message) errors.push({ rowNumber: row.rowNumber, field, message });
    }

    if (row.companyEmail?.trim() && !EMAIL_RE.test(row.companyEmail.trim())) {
      errors.push({ rowNumber: row.rowNumber, field: "companyEmail", message: "Invalid companyEmail" });
    }

    if (row.personalEmail?.trim() && !EMAIL_RE.test(row.personalEmail.trim())) {
      errors.push({ rowNumber: row.rowNumber, field: "personalEmail", message: "Invalid personalEmail" });
    }

    return errors;
  });
}

function withDisplayedErrors(
  preview: BulkOnboardingPreviewResult | null,
  rows: BulkOnboardingRowInput[],
  errors: BulkOnboardingRowError[],
): BulkOnboardingPreviewResult | null {
  const displayErrors = errors.map(displayBulkError);

  if (!preview && displayErrors.length === 0) return null;

  const invalidRowNumbers = new Set(displayErrors.map((error) => error.rowNumber));
  const previewRows =
    preview?.rows ??
    rows.map((row) => ({
      rowNumber: row.rowNumber,
      employeeName: [row.firstName, row.lastName].filter(Boolean).join(" ") || "-",
      companyEmail: row.companyEmail ?? "",
      jobTitle: row.jobTitle ?? "",
      department: row.department ?? "",
      supervisorEmail: row.supervisorEmail ?? null,
      supervisorName: null,
      status: invalidRowNumbers.has(row.rowNumber) ? "invalid" as const : "valid" as const,
    }));

  return {
    totalRows: preview?.totalRows ?? rows.length,
    validRows: rows.length - invalidRowNumbers.size,
    invalidRows: invalidRowNumbers.size,
    errors: displayErrors,
    rows: previewRows.map((row) => ({
      ...row,
      status: invalidRowNumbers.has(row.rowNumber) ? "invalid" : row.status,
    })),
  };
}

export function BulkUploadDropzone({ open, onOpenChange }: BulkUploadDropzoneProps) {
  const previewMutation = useBulkOnboardingPreview();
  const commitMutation = useBulkOnboardingCommit();
  const { employees: activeEmployees } = useAllEmployees({ status: "active", enabled: open });
  const { departments, loading: departmentsLoading } = useDepartments();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rows, setRows] = useState<BulkOnboardingRowInput[]>([]);
  const [preview, setPreview] = useState<BulkOnboardingPreviewResult | null>(null);
  const [result, setResult] = useState<BulkOnboardingCommitResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewStale, setPreviewStale] = useState(false);
  const rowsRef = useRef(rows);

  rowsRef.current = rows;

  const hasUploadedFile = Boolean(selectedFile && rows.length > 0);
  const canCommit =
    rows.length > 0 &&
    preview !== null &&
    preview.errors.length === 0 &&
    !previewStale &&
    !result;
  const isBusy = isExtracting || previewMutation.isPending || commitMutation.isPending;
  const loadingLabel = isExtracting ? "Extracting document" : null;
  const liveErrors = useMemo(() => validateLiveBulkRows(rows), [rows]);
  const displayedPreview = useMemo(
    () => withDisplayedErrors(preview, rows, previewStale ? liveErrors : preview?.errors ?? liveErrors),
    [liveErrors, preview, previewStale, rows],
  );

  const groupedErrors = useMemo(
    () => groupErrorsByRow(displayedPreview?.errors ?? []).slice(0, 6),
    [displayedPreview],
  );

  function reset() {
    setSelectedFile(null);
    setRows([]);
    setPreview(null);
    setResult(null);
    setParseError(null);
    setIsExtracting(false);
    setPreviewStale(false);
  }

  const runPreview = useCallback(
    (nextRows: BulkOnboardingRowInput[]) => {
      if (nextRows.length === 0) return;
      previewMutation.mutate(nextRows, {
        onSuccess: (data) => {
          setPreview(data);
          setPreviewStale(false);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Could not preview the upload.");
        },
      });
    },
    [previewMutation],
  );

  function checkRows() {
    runPreview(rowsRef.current);
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

    setSelectedFile(file);
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
      runPreview(nextRows);
    } catch {
      setIsExtracting(false);
      setParseError("Could not read the workbook. Check the file and try again.");
    }
  }

  function clearFile() {
    reset();
  }

  function removeRow(rowNumber: number) {
    const nextRows = rowsRef.current.filter((row) => row.rowNumber !== rowNumber);

    if (nextRows.length === 0) {
      reset();
      return;
    }

    setRows(nextRows);
    setPreview(null);
    setResult(null);
    setPreviewStale(true);
  }

  function updateRow(rowNumber: number, patch: Partial<BulkOnboardingRowInput>) {
    const nextRows = rowsRef.current.map((row) =>
      row.rowNumber === rowNumber ? { ...row, ...patch } : row,
    );
    setRows(nextRows);
    setPreviewStale(true);
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

  function handleCancel() {
    if (isBusy) return;
    reset();
    onOpenChange(false);
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
      <DialogContent
        hideClose
        className={`flex max-w-none flex-col overflow-y-auto overflow-x-hidden p-6 ${
          hasUploadedFile
            ? "max-h-[calc(100dvh-2rem)] w-[min(1536px,calc(100vw-2rem))]"
            : "max-h-[calc(100dvh-2rem)] w-[min(1100px,calc(100vw-2rem))]"
        }`}
      >
        {loadingLabel ? (
          <div className="absolute inset-0 z-[60] flex items-center justify-center rounded-[inherit] bg-white/85 px-6 text-center backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[color:var(--text-tertiary)]" />
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                {loadingLabel}
              </p>
              <p className="mt-1 max-w-[280px] text-xs text-[color:var(--text-tertiary)]">
                Reading the workbook and preparing the rows.
              </p>
            </div>
          </div>
        ) : null}

        <DialogHeader className="flex shrink-0 flex-col gap-1.5 space-y-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-lg font-bold leading-7 tracking-tight text-[color:var(--text-primary)]">
              Bulk onboarding
            </DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                disabled={isBusy}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </DialogClose>
          </div>
          <DialogDescription className="text-sm leading-5 text-[color:var(--text-tertiary)]">
            Upload an .xlsx with one employee per row. Every row is checked before any records are
            created.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-8 flex flex-col gap-4">
          {!hasUploadedFile ? (
            <>
              <div className="flex min-w-0 shrink-0 flex-col gap-2 rounded-lg border border-[color:var(--border-primary)] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    Start with the template
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                    Includes the right columns and {TEMPLATE_SAMPLE_ROWS.length} sample rows.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => void downloadTemplate()}
                >
                  <Download aria-hidden="true" />
                  Download template
                </Button>
              </div>

              <div>
                <FileUploadBox
                  accept={bulkSpreadsheetAcceptAttribute()}
                  disabled={isBusy}
                  onFileSelect={(file) => void parseFile(file)}
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-[color:var(--text-tertiary)]">
                    Required columns: {REQUIRED_COLUMNS.join(", ")}
                  </p>
                  <p className="text-xs text-[color:var(--text-tertiary)]">
                    Optional pre-fill columns: {OPTIONAL_COLUMNS.join(", ")}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="shrink-0">
              {selectedFile ? (
                <FileUploadChip
                  file={selectedFile}
                  disabled={isBusy}
                  formatFileSize={formatBulkSpreadsheetFileSize}
                  onRemove={clearFile}
                />
              ) : null}
            </div>
          )}

          {parseError ? (
            <p className="shrink-0 rounded-lg border border-[color:var(--color-error-200)] bg-[color:var(--color-error-50)] px-3 py-2 text-sm text-[color:var(--color-error-700)]">
              {parseError}
            </p>
          ) : null}

          {hasUploadedFile ? (
            <>
              <BulkJobStatus
                preview={displayedPreview}
                result={result}
                previewStale={previewStale}
                isChecking={previewMutation.isPending}
              />

              <BulkPreviewTable
                rows={rows}
                preview={displayedPreview}
                departments={departments}
                employees={activeEmployees}
                departmentsLoading={departmentsLoading}
                disabled={isBusy}
                onUpdateRow={updateRow}
                onRemoveRow={removeRow}
              />

              {groupedErrors.length > 0 && displayedPreview ? (
                <div className="max-h-[180px] min-h-0 shrink-0 overflow-y-auto rounded-lg border border-[color:var(--color-error-200)] bg-[#FFFBFA]">
                  <div className="flex flex-col gap-2 border-b border-[color:var(--color-error-200)] bg-[color:var(--color-error-50)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[color:var(--color-error-700)]" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[color:var(--color-error-700)]">
                          Fix {displayedPreview.invalidRows} row{displayedPreview.invalidRows === 1 ? "" : "s"} before
                          commit
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-error-900)]">
                          Fix in the table or remove the file and upload again.
                        </p>
                      </div>
                    </div>
                    <Badge variant="error" pill className="font-semibold">
                      {displayedPreview.errors.length} issue{displayedPreview.errors.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  <div className="space-y-2 p-3">
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
                              className="grid gap-1 text-xs sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start sm:gap-2"
                            >
                              <Badge
                                variant="error"
                                pill
                                className="w-fit max-w-full justify-self-start truncate font-semibold sm:w-full sm:justify-center"
                              >
                                {fieldLabel(error.field)}
                              </Badge>
                              <span className="min-w-0 break-words pt-[5px] text-[color:var(--color-error-900)]">
                                {error.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {displayedPreview.invalidRows > groupedErrors.length ? (
                    <p className="border-t border-[color:var(--color-error-200)] bg-white px-3 py-2 text-xs text-[color:var(--color-error-900)]">
                      Showing first {groupedErrors.length} rows with issues. The full file has{" "}
                      {displayedPreview.invalidRows} invalid rows.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:flex-wrap sm:space-x-0">
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            onClick={hasUploadedFile ? clearFile : handleCancel}
          >
            {hasUploadedFile ? "Clear" : "Cancel"}
          </Button>
          {hasUploadedFile ? (
            <Button
              type="button"
              variant="outline"
              className="border-[color:var(--color-success-600)] bg-white text-[color:var(--color-success-700)] hover:bg-[color:var(--color-success-50)] hover:text-[color:var(--color-success-700)]"
              disabled={isBusy || !previewStale}
              onClick={checkRows}
            >
              {previewMutation.isPending ? "Checking..." : "Check rows"}
            </Button>
          ) : null}
          <Button type="button" disabled={!canCommit || isBusy} onClick={commitRows}>
            {commitMutation.isPending ? "Creating..." : "Create and send invites"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
