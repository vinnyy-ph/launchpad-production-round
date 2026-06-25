import type {
  GetInvitationStatusParamsDto,
  ResendInvitationParamsDto,
  SendInvitationParamsDto,
  UpdateInvitationEmailRequestDto,
} from "./dto";
import { assertSafeText } from "../../../../core/validation/text-input";
import { PEOPLE_TEXT_LIMITS } from "../../people-text-limits";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parses and validates invitation route params and request bodies.
 */
export class InvitationValidation {
  /** Validates recordId for send and status endpoints. */
  parseRecordIdParam(params: Record<string, unknown>): SendInvitationParamsDto {
    const recordId = this.requireString(params.recordId, "recordId");

    return { recordId };
  }

  /** Validates recordId for the list/status endpoint. */
  parseGetStatusParams(
    params: Record<string, unknown>,
  ): GetInvitationStatusParamsDto {
    const recordId = this.requireString(params.recordId, "recordId");

    return { recordId };
  }

  /** Validates invitationId for resend and email-correction endpoints. */
  parseInvitationIdParam(
    params: Record<string, unknown>,
  ): ResendInvitationParamsDto {
    const invitationId = this.requireString(params.invitationId, "invitationId");

    return { invitationId };
  }

  /** Validates the corrected email address in the request body. */
  parseUpdateEmailBody(
    body: Record<string, unknown>,
  ): UpdateInvitationEmailRequestDto {
    const email = this.requireEmail(body.email, "email");

    return { email: email.toLowerCase() };
  }

  /** Extracts a non-empty trimmed string or throws with the field name. */
  private requireString(value: unknown, field: string): string {
    if (typeof value !== "string") {
      throw new Error(`${field} is required`);
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error(`${field} is required`);
    }

    return trimmed;
  }

  /** Validates a required email string. */
  private requireEmail(value: unknown, field: string): string {
    const email = this.requireString(value, field);

    if (!EMAIL_PATTERN.test(email)) {
      throw new Error("Invalid email");
    }

    assertSafeText(email, field, PEOPLE_TEXT_LIMITS.EMAIL);

    return email;
  }
}
