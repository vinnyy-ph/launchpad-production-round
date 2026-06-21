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
