import type {
  RejectClearanceRequestDto,
  SignClearanceRequestDto,
} from "./dto";
import { assertSafeText } from "../../../../core/validation/text-input";
import { PEOPLE_TEXT_LIMITS } from "../../people-text-limits";

const SIGNATURE_IMAGE_MAX_LENGTH = 1_000_000;
const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

/**
 * Parses and validates clearance request bodies and route params.
 * Sign takes an optional note; reject requires a note.
 */
export class ClearanceValidation {
  /** Validates the :requestId route param. */
  parseRequestIdParam(params: Record<string, unknown>): { requestId: string } {
    return { requestId: this.requireString(params.requestId, "requestId") };
  }

  /** Validates the sign body — note is optional. */
  parseSignBody(body: Record<string, unknown>): SignClearanceRequestDto {
    const note = this.optionalString(body.note);
    const signatureImage = this.requireSignatureImage(body.signatureImage);
    return { signatureImage, ...(note !== undefined ? { note } : {}) };
  }

  /** Validates the reject body — note is required. */
  parseRejectBody(body: Record<string, unknown>): RejectClearanceRequestDto {
    const note = this.optionalString(body.note);

    if (note === undefined) {
      throw new Error("Rejection note required");
    }

    return { note };
  }

  /** Validates the replace-signatory body — the new signatory's employee id. */
  parseReplaceBody(body: Record<string, unknown>): { newSignatoryId: string } {
    return { newSignatoryId: this.requireString(body.newSignatoryId, "newSignatoryId") };
  }

  /** Extracts a non-empty trimmed string or throws with the field name. */
  private requireString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} is required`);
    }

    return value.trim();
  }

  /** Returns a trimmed string when provided and non-empty; otherwise undefined. */
  private optionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      assertSafeText(trimmed, "note", PEOPLE_TEXT_LIMITS.NOTE);
    }
    return trimmed.length === 0 ? undefined : trimmed;
  }

  /** Validates the client-generated PNG data URL saved with a signed clearance. */
  private requireSignatureImage(value: unknown): string {
    const signatureImage = this.requireString(value, "signatureImage");

    if (
      signatureImage.length > SIGNATURE_IMAGE_MAX_LENGTH ||
      !PNG_DATA_URL_PATTERN.test(signatureImage)
    ) {
      throw new Error("signatureImage must be a PNG data URL");
    }

    return signatureImage;
  }
}
