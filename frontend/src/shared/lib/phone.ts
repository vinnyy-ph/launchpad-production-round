"use client";

const PHILIPPINES = "PH" as const;

/** Lazy-load libphonenumber-js (client-only; avoids Next.js SSR vendor chunk errors). */
export function loadPhoneUtils() {
  return import("libphonenumber-js/min");
}

/** Normalize stored phone values to E.164 for the phone input. */
export async function toE164(value: string): Promise<string> {
  if (!value.trim()) return "";
  const { parsePhoneNumber } = await loadPhoneUtils();
  try {
    const parsed = parsePhoneNumber(value, PHILIPPINES);
    return parsed?.number ?? value;
  } catch {
    return value;
  }
}

/** Validate a Philippine mobile number (E.164 or national format). */
export async function isValidPhilippinePhone(value: string): Promise<boolean> {
  if (!value.trim()) return false;
  const { isValidPhoneNumber } = await loadPhoneUtils();
  return isValidPhoneNumber(value, PHILIPPINES);
}

/**
 * Strict Philippine mobile check: exactly 11 digits starting with "09" in national form.
 * Accepts the E.164 value the PhoneInput emits (+639XXXXXXXXX) since it maps to the same number.
 * Synchronous so it can run inline during form submission without loading libphonenumber-js.
 */
export function isStrictPhilippineMobile(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  // National form: 09XXXXXXXXX (11 digits).
  if (/^09\d{9}$/.test(digits)) return true;
  // E.164 form emitted by PhoneInput: +639XXXXXXXXX (digits-only: 639 + 9 more).
  return /^639\d{9}$/.test(digits);
}

/**
 * Normalize a stored PH mobile (national "09…", "639…", or "9…") to the E.164 form
 * (+639XXXXXXXXX) the PhoneInput expects, so a freshly-loaded value doesn't read as an edit.
 * Synchronous companion to {@link toE164}; keeps already-international values in strict
 * E.164 shape so react-phone-number-input never receives display-formatted numbers.
 */
export function toPhilippineE164(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (/^9\d{9}$/.test(digits)) return `+63${digits}`;
  if (trimmed.startsWith("+") && digits) return `+${digits}`;
  return trimmed;
}

/** Formats PH mobile values for read-only display while storage remains E.164. */
export function formatPhilippinePhoneDisplay(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  const e164 = toPhilippineE164(value);
  const digits = e164.replace(/\D/g, "");

  if (!/^639\d{9}$/.test(digits)) {
    return value;
  }

  const localPart = digits.slice(2);
  return `+63 ${localPart.slice(0, 3)} ${localPart.slice(3, 6)} ${localPart.slice(6)}`;
}
