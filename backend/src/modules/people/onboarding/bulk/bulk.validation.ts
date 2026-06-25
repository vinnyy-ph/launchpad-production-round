
import type { ParsedBulkOnboardingRows } from "./bulk.types";
import { OnboardingValidation } from "../onboarding.validation";
import { assertSafeText } from "../../../../core/validation/text-input";
import { PEOPLE_TEXT_LIMITS } from "../../people-text-limits";

const MAX_BULK_ROWS = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PEOPLE_LANGUAGE_MESSAGE = "Please remove any offensive or inappropriate language.";

const REQUIRED_BULK_FIELDS = [
  ["companyEmail", "Work email", PEOPLE_TEXT_LIMITS.EMAIL],
  ["firstName", "First name", PEOPLE_TEXT_LIMITS.NAME],
  ["lastName", "Last name", PEOPLE_TEXT_LIMITS.NAME],
  ["jobTitle", "Job title", PEOPLE_TEXT_LIMITS.JOB_TITLE],
  ["department", "Department", PEOPLE_TEXT_LIMITS.DEPARTMENT_NAME],
] as const;

const OPTIONAL_BULK_TEXT_FIELDS = [
  ["middleName", "Middle name", PEOPLE_TEXT_LIMITS.NAME],
  ["personalEmail", "Personal email", PEOPLE_TEXT_LIMITS.EMAIL],
  ["address", "Street address", PEOPLE_TEXT_LIMITS.ADDRESS_LINE],
  ["city", "City", PEOPLE_TEXT_LIMITS.LOCATION],
  ["province", "Province", PEOPLE_TEXT_LIMITS.LOCATION],
  ["country", "Country", PEOPLE_TEXT_LIMITS.LOCATION],
  ["emergencyContactName", "Emergency contact name", PEOPLE_TEXT_LIMITS.NAME],
  ["emergencyContact", "Emergency contact", PEOPLE_TEXT_LIMITS.PHONE_DISPLAY],
] as const;

const NAME_LANGUAGE_ALLOWLIST = new Set(["dickson", "scunthorpe"]);
const BLOCKED_NAME_LANGUAGE_TOKENS = new Set([
  "asshole",
  "bitch",
  "bitches",
  "bullshit",
  "cunt",
  "damn",
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "nigga",
  "nigger",
  "piss",
  "shit",
  "shitty",
  "slut",
  "whore",
]);

const LEETSPEAK_CHARACTERS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "!": "i",
  "3": "e",
  "4": "a",
  "@": "a",
  "5": "s",
  "$": "s",
  "7": "t",
  "9": "g",
};

function normalizeLanguageToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[0134579!@$]/g, (char) => LEETSPEAK_CHARACTERS[char] ?? char)
    .replace(/(.)\1{2,}/g, "$1$1");
}

function languageTokens(value: string): string[] {
  const normalized = normalizeLanguageToken(value);
  const spacedTokens = normalized.replace(/[^a-z0-9]+/g, " ").split(/\s+/);
  const deobfuscatedTokens = normalized
    .replace(/[._*~`'"^:;|\\/[{(<>)}\],+-]+/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/);

  const tokens = [...spacedTokens, ...deobfuscatedTokens]
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.flatMap((token) => [token, token.replace(/(.)\1{1,}/g, "$1")]);
}

function withoutVowels(value: string): string {
  return value.replace(/[aeiou]/g, "");
}

function isBlockedLanguageToken(token: string): boolean {
  const tokenVariants = [token, token.replace(/l/g, "i")];
  if (tokenVariants.some((variant) => BLOCKED_NAME_LANGUAGE_TOKENS.has(variant))) return true;
  if (token.length < 3 || /[aeiou]/.test(token)) return false;

  return tokenVariants.some((variant) =>
    [...BLOCKED_NAME_LANGUAGE_TOKENS].some(
      (blockedToken) => withoutVowels(blockedToken) === withoutVowels(variant),
    ),
  );
}

function containsMaskedLanguage(value: string): boolean {
  const normalized = normalizeLanguageToken(value);
  return /(^|[^a-z0-9])[fsb][*._-]{2,}(?=$|[^a-z0-9])/.test(normalized);
}

function containsBlockedLanguage(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const normalizedWholeValue = normalizeLanguageToken(trimmed).replace(/[^a-z0-9]+/g, "");
  if (NAME_LANGUAGE_ALLOWLIST.has(normalizedWholeValue)) return false;

  return containsMaskedLanguage(trimmed) || languageTokens(trimmed).some(isBlockedLanguageToken);
}

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
        const fieldErrors = this.validateRowTextFields(rawRow, rowNumber);
        if (fieldErrors.length > 0) {
          errors.push(...fieldErrors);
          return;
        }

        const supervisorEmail = this.optionalString(rawRow.supervisorEmail);
        const supervisorId = this.optionalString(rawRow.supervisorId);

        if (!supervisorEmail && !supervisorId) {
          throw new Error("supervisorEmail is required");
        }

        if (supervisorEmail && !EMAIL_PATTERN.test(supervisorEmail)) {
          throw new Error("Invalid supervisorEmail");
        }

        const rowForParsing = {
          ...rawRow,
          supervisorId: supervisorId ?? "__pending_supervisor_email__",
        };
        const parsed = this.onboardingValidation.parseOnboardBody(rowForParsing);

        if (!supervisorId) {
          delete (parsed as Partial<typeof parsed>).supervisorId;
        }

        rows.push({
          ...parsed,
          ...(supervisorId ? { supervisorId } : {}),
          ...(supervisorEmail ? { supervisorEmail: supervisorEmail.toLowerCase() } : {}),
          rowNumber,
        });
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

  private optionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  private validateRowTextFields(
    row: Record<string, unknown>,
    rowNumber: number,
  ): ParsedBulkOnboardingRows["errors"] {
    const errors: ParsedBulkOnboardingRows["errors"] = [];

    for (const [field, label, maxLen] of REQUIRED_BULK_FIELDS) {
      const value = row[field];
      const error = this.validateRequiredText(value, field, label, maxLen);
      if (error) errors.push({ rowNumber, field, message: error });
    }

    if (!this.optionalString(row.supervisorEmail) && !this.optionalString(row.supervisorId)) {
      const field = row.supervisorEmail !== undefined ? "supervisorEmail" : "supervisorId";
      const value = row.supervisorEmail ?? row.supervisorId;
      errors.push({
        rowNumber,
        field,
        message:
          typeof value === "string" && value.length > 0
            ? "Supervisor cannot be empty spaces."
            : "Supervisor is required.",
      });
    } else if (this.optionalString(row.supervisorEmail)) {
      const error = this.validateOptionalText(
        row.supervisorEmail,
        "supervisorEmail",
        "Supervisor",
        PEOPLE_TEXT_LIMITS.EMAIL,
      );
      if (error) errors.push({ rowNumber, field: "supervisorEmail", message: error });
    }

    for (const [field, label, maxLen] of OPTIONAL_BULK_TEXT_FIELDS) {
      const error = this.validateOptionalText(row[field], field, label, maxLen);
      if (error) errors.push({ rowNumber, field, message: error });
    }

    return errors;
  }

  private validateRequiredText(
    value: unknown,
    field: string,
    label: string,
    maxLen: number,
  ): string | undefined {
    if (value === undefined || value === null || value === "") {
      return `${label} is required.`;
    }

    if (typeof value !== "string") {
      return `Invalid ${field}`;
    }

    if (value.trim().length === 0) {
      return `${label} cannot be empty spaces.`;
    }

    return this.validateTextContent(value.trim(), label, maxLen);
  }

  private validateOptionalText(
    value: unknown,
    field: string,
    label: string,
    maxLen: number,
  ): string | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    if (typeof value !== "string") {
      return `Invalid ${field}`;
    }

    if (value.trim().length === 0) {
      return undefined;
    }

    return this.validateTextContent(value.trim(), label, maxLen);
  }

  private validateTextContent(value: string, label: string, maxLen: number): string | undefined {
    if (containsBlockedLanguage(value)) {
      return PEOPLE_LANGUAGE_MESSAGE;
    }

    try {
      assertSafeText(value, label, maxLen);
    } catch (error) {
      return error instanceof Error ? error.message : `${label} is invalid.`;
    }

    return undefined;
  }

  private resolveRowNumber(row: unknown, index: number): number {
    if (row && typeof row === "object") {
      const rowNumber = (row as Record<string, unknown>).rowNumber;
      if (typeof rowNumber === "number" && Number.isFinite(rowNumber)) {
        return rowNumber;
      }
    }

    return index + 1;
  }

  private resolveErrorField(error: unknown): string {
    if (!(error instanceof Error)) {
      return "row";
    }

    if (error.message.startsWith("Invalid ")) {
      return error.message.replace("Invalid ", "");
    }

    if (error.message.endsWith(" is required")) {
      return error.message.replace(" is required", "");
    }

    if (error.message === "Invalid birthday") {
      return "birthday";
    }

    if (error.message === "Employee must meet the minimum employment age.") {
      return "birthday";
    }

    if (error.message === "Invalid emergency contact phone number") {
      return "emergencyContact";
    }

    return "row";
  }
}
