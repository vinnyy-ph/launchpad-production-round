import type {
  ClearanceTemplateSignatoryInputDto,
  CreateClearanceTemplateRequestDto,
  UpdateClearanceTemplateRequestDto,
} from "./dto";

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
      name: this.requireString(body.name, "name"),
      isDefault: this.optionalBoolean(body.isDefault) ?? false,
      signatories: this.parseSignatories(body.signatories),
    };
  }

  /** Validates the update-version body (name + signatories; default managed separately). */
  parseUpdateBody(
    body: Record<string, unknown>,
  ): UpdateClearanceTemplateRequestDto {
    return {
      name: this.requireString(body.name, "name"),
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
        purpose: this.requireString(
          entry.purpose,
          `signatories[${index}].purpose`,
        ),
        requirements: this.requireString(
          entry.requirements,
          `signatories[${index}].requirements`,
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
