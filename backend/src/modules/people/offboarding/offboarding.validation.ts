import type {
  InitiateOffboardingRequestDto,
  ReassignReportsRequestDto,
} from "./dto";

/**
 * Parses and validates offboarding request bodies and route params.
 * Throws descriptive errors the controller maps to HTTP responses.
 */
export class OffboardingValidation {
  /** Validates the initiate-offboarding body. */
  parseInitiateBody(body: Record<string, unknown>): InitiateOffboardingRequestDto {
    const employeeId = this.requireString(body.employeeId, "employeeId");
    const tenderDate = this.requireDate(body.tenderDate, "tenderDate");
    const effectiveDate = this.requireDate(body.effectiveDate, "effectiveDate");

    if (new Date(effectiveDate) < new Date(tenderDate)) {
      throw new Error("Invalid effective date");
    }

    const dto: InitiateOffboardingRequestDto = {
      employeeId,
      tenderDate,
      effectiveDate,
    };

    const clearanceTemplateId = this.optionalString(body.clearanceTemplateId);
    if (clearanceTemplateId !== undefined) {
      dto.clearanceTemplateId = clearanceTemplateId;
    }

    const newSupervisorId = this.optionalString(body.newSupervisorId);
    if (newSupervisorId !== undefined) {
      dto.newSupervisorId = newSupervisorId;
    }

    return dto;
  }

  /** Validates the reassign body. */
  parseReassignBody(body: Record<string, unknown>): ReassignReportsRequestDto {
    return {
      newSupervisorId: this.requireString(body.newSupervisorId, "newSupervisorId"),
    };
  }

  /** Validates the :id route param. */
  parseIdParam(params: Record<string, unknown>): { id: string } {
    return { id: this.requireString(params.id, "id") };
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
    return trimmed.length === 0 ? undefined : trimmed;
  }

  /** Validates a required ISO date string or throws when invalid. */
  private requireDate(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} is required`);
    }

    const trimmed = value.trim();
    if (Number.isNaN(new Date(trimmed).getTime())) {
      throw new Error(`Invalid ${field}`);
    }

    return trimmed;
  }
}
