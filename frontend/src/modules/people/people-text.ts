import { containsUnsafeText } from "@/shared/lib/safe-text";

export const PEOPLE_NAME_LANGUAGE_MESSAGE =
  "Please remove any offensive or inappropriate language.";

export const PEOPLE_TEXT_LIMITS = {
  NAME: 100,
  EMAIL: 254,
  JOB_TITLE: 150,
  DEPARTMENT_NAME: 100,
  TEAM_NAME: 100,
  ADDRESS_LINE: 200,
  LOCATION: 100,
  PHONE_DISPLAY: 50,
  CUSTOM_FIELD_LABEL: 200,
  CUSTOM_FIELD_VALUE: 1000,
  DOCUMENT_NAME: 200,
  DOCUMENT_INSTRUCTIONS: 2000,
  NOTE: 1000,
  CLEARANCE_TEMPLATE_NAME: 200,
  CLEARANCE_PURPOSE: 200,
  CLEARANCE_REQUIREMENTS: 1000,
} as const;

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

function normalizeNameLanguageToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[0134579!@$]/g, (char) => LEETSPEAK_CHARACTERS[char] ?? char)
    .replace(/(.)\1{2,}/g, "$1$1");
}

function nameLanguageTokens(value: string): string[] {
  const normalized = normalizeNameLanguageToken(value);
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

function isBlockedNameLanguageToken(token: string): boolean {
  const tokenVariants = [token, token.replace(/l/g, "i")];
  if (tokenVariants.some((variant) => BLOCKED_NAME_LANGUAGE_TOKENS.has(variant))) return true;
  if (token.length < 3) return false;

  return tokenVariants.some((variant) =>
    [...BLOCKED_NAME_LANGUAGE_TOKENS].some(
      (blockedToken) => withoutVowels(blockedToken) === withoutVowels(variant),
    ),
  );
}

function containsMaskedNameLanguage(value: string): boolean {
  const normalized = normalizeNameLanguageToken(value);
  return /(^|[^a-z0-9])[fsb][*._-]{2,}(?=$|[^a-z0-9])/.test(normalized);
}

export function validatePeopleNameLanguage(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const normalizedWholeValue = normalizeNameLanguageToken(trimmed).replace(/[^a-z0-9]+/g, "");
  if (NAME_LANGUAGE_ALLOWLIST.has(normalizedWholeValue)) return undefined;

  return containsMaskedNameLanguage(trimmed) ||
    nameLanguageTokens(trimmed).some(isBlockedNameLanguageToken)
    ? PEOPLE_NAME_LANGUAGE_MESSAGE
    : undefined;
}

/** Applies profanity/slur screening, then standard length and safe-text checks. */
export function validatePeopleFieldText(
  value: string,
  label: string,
  maxLen: number,
): string | undefined {
  const languageError = validatePeopleNameLanguage(value);
  if (languageError) return languageError;
  return validatePeopleText(value, label, maxLen);
}

export function validatePeopleText(
  value: string,
  label: string,
  maxLen: number,
): string | undefined {
  if (value.length > maxLen) {
    return `${label} must be ${maxLen} characters or fewer.`;
  }
  if (containsUnsafeText(value)) {
    return `${label} must not contain HTML or special characters.`;
  }
  return undefined;
}

/** Minimum age (in whole years) required for employment in the Philippines. */
export const MINIMUM_EMPLOYMENT_AGE = 15;

export const EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE =
  "Employee must meet the minimum employment age.";

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Latest calendar date of birth that still satisfies the minimum employment age today. */
export function getLatestAllowedEmployeeBirthday(referenceDate = new Date()): Date {
  const today = startOfDay(referenceDate);
  const latest = new Date(today);
  latest.setFullYear(latest.getFullYear() - MINIMUM_EMPLOYMENT_AGE);
  return latest;
}

export function validateEmployeeBirthday(
  value: string | Date | undefined | null,
  options?: { required?: boolean; referenceDate?: Date },
): string | undefined {
  if (!value) {
    return options?.required ? "Birthday is required." : undefined;
  }

  const selected =
    value instanceof Date ? startOfDay(value) : startOfDay(new Date(`${value}T00:00:00`));

  if (Number.isNaN(selected.getTime())) {
    return "Please enter a valid birthday.";
  }

  const today = startOfDay(options?.referenceDate ?? new Date());

  if (selected > today) {
    return "Birthday cannot be in the future.";
  }

  if (selected > getLatestAllowedEmployeeBirthday(today)) {
    return EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE;
  }

  return undefined;
}
