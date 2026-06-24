import type {
  ClearanceTemplateSignatoryInputDto,
  CreateClearanceTemplateRequestDto,
  UpdateClearanceTemplateRequestDto,
} from "./dto";
import { assertSafeText } from "../../../../core/validation/text-input";
import { PEOPLE_TEXT_LIMITS } from "../../people-text-limits";

/**
 * Parses and validates clearance-version request bodies and route params.
 * Throws descriptive errors the controller maps to HTTP responses.
 */
export class ClearanceTemplatesValidation {
  /** Validates the create-version body (name + isDefault + non-empty signatories). */
  parseCreateBody(
    body: Record<string, unknown>,
  ): CreateClearanceTemplateRequestDto {
    return {
      name: this.requireText(body.name, "name", PEOPLE_TEXT_LIMITS.CLEARANCE_TEMPLATE_NAME),
      isDefault: this.optionalBoolean(body.isDefault) ?? false,
      signatories: this.parseSignatories(body.signatories),
    };
  }

  /** Validates the update-version body (name + signatories; default managed separately). */
  parseUpdateBody(
    body: Record<string, unknown>,
  ): UpdateClearanceTemplateRequestDto {
    return {
      name: this.requireText(body.name, "name", PEOPLE_TEXT_LIMITS.CLEARANCE_TEMPLATE_NAME),
      signatories: this.parseSignatories(body.signatories),
    };
  }

  /** Validates the :id route param. */
  parseIdParam(params: Record<string, unknown>): { id: string } {
    return { id: this.requireString(params.id, "id") };
  }

  /** Validates and normalizes the signatory list — at least one, no duplicate employees. */
  private parseSignatories(
    value: unknown,
  ): ClearanceTemplateSignatoryInputDto[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("Clearance template requires signatory");
    }

    const signatories = value.map((raw, index) => {
      if (typeof raw !== "object" || raw === null) {
        throw new Error(`signatories[${index}] is required`);
      }

      const entry = raw as Record<string, unknown>;

      return {
        employeeId: this.requireString(
          entry.employeeId,
          `signatories[${index}].employeeId`,
        ),
        purpose: this.requireText(
          entry.purpose,
          `signatories[${index}].purpose`,
          PEOPLE_TEXT_LIMITS.CLEARANCE_PURPOSE,
        ),
        requirements: this.requireText(
          entry.requirements,
          `signatories[${index}].requirements`,
          PEOPLE_TEXT_LIMITS.CLEARANCE_REQUIREMENTS,
        ),
      };
    });

    const employeeIds = signatories.map((signatory) => signatory.employeeId);
    if (new Set(employeeIds).size !== employeeIds.length) {
      throw new Error("Duplicate clearance signatory");
    }

    return signatories;
  }

  /** Extracts a non-empty trimmed string or throws with the field name. */
  private requireString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} is required`);
    }

    return value.trim();
  }

  /** Extracts required free text and applies stored-text safety checks. */
  private requireText(value: unknown, field: string, maxLen: number): string {
    const parsed = this.requireString(value, field);
    assertSafeText(parsed, field, maxLen);
    return parsed;
  }

  /** Coerces an optional boolean (accepts the "true"/"false" strings forms too). */
  private optionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    throw new Error("Invalid isDefault");
  }
}
