/**
 * Parsed emergency contact with a validated Philippine mobile number.
 */
export interface ParsedEmergencyContact {
  /** Contact person name when provided (e.g. "Jane Doe"). */
  contactName: string | null;
  /** Canonical digits-only Philippine mobile: 639XXXXXXXXX. */
  normalizedPhone: string;
  /** Value stored on the employee record. */
  displayValue: string;
}

/**
 * Normalizes a Philippine mobile number to 639XXXXXXXXX.
 * Accepts local (09XX), international (+63/63), or bare mobile (9XX) formats.
 */
export function normalizePhilippineMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  let normalized: string;

  if (digits.length === 11 && digits.startsWith("09")) {
    normalized = `63${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith("639")) {
    normalized = digits;
  } else if (digits.length === 10 && digits.startsWith("9")) {
    normalized = `63${digits}`;
  } else {
    return null;
  }

  if (!/^639\d{9}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Formats a normalized Philippine mobile number for display.
 * Example: 639171234567 -> +63 917 123 4567
 */
export function formatPhilippineMobileDisplay(normalizedPhone: string): string {
  const localPart = normalizedPhone.slice(2);

  return `+63 ${localPart.slice(0, 3)} ${localPart.slice(3, 6)} ${localPart.slice(6)}`;
}

/**
 * Parses an emergency contact string and validates the embedded Philippine mobile number.
 * Supports "Name - Phone", "Name, Phone", or phone-only values.
 */
export function parseEmergencyContact(value: string): ParsedEmergencyContact {
  const trimmed = value.trim();
  let contactName: string | null = null;
  let phonePart: string;

  const dashSeparator = " - ";
  const dashIndex = trimmed.lastIndexOf(dashSeparator);

  if (dashIndex !== -1) {
    contactName = trimmed.slice(0, dashIndex).trim();
    phonePart = trimmed.slice(dashIndex + dashSeparator.length).trim();
  } else {
    const commaIndex = trimmed.lastIndexOf(", ");

    if (commaIndex !== -1) {
      contactName = trimmed.slice(0, commaIndex).trim();
      phonePart = trimmed.slice(commaIndex + 2).trim();
    } else {
      phonePart = trimmed;
    }
  }

  if (contactName === "") {
    contactName = null;
  }

  const normalizedPhone = normalizePhilippineMobile(phonePart);

  if (!normalizedPhone) {
    throw new Error("Invalid emergency contact phone number");
  }

  const formattedPhone = formatPhilippineMobileDisplay(normalizedPhone);
  const displayValue = contactName ? `${contactName} - ${formattedPhone}` : formattedPhone;

  return {
    contactName,
    normalizedPhone,
    displayValue,
  };
}

/**
 * Attempts to extract a normalized Philippine mobile from a stored emergency contact value.
 * Returns null when the value cannot be parsed (e.g. legacy non-PH data).
 */
export function tryExtractNormalizedPhilippinePhone(value: string): string | null {
  try {
    return parseEmergencyContact(value).normalizedPhone;
  } catch {
    return null;
  }
}
