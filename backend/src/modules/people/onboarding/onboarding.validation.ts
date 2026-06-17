import type { OnboardEmployeeRequestDto } from "./dto";

/**
 * Parses and validates the onboard-employee request body.
 * Throws descriptive errors when required fields are missing or empty.
 */
export class OnboardingValidation {
  /**
   * Validates the four required onboarding fields from the raw request body.
   * Returns a typed DTO when all fields are present and non-empty.
   */
  parseOnboardBody(body: Record<string, unknown>): OnboardEmployeeRequestDto {
    const companyEmail = this.requireString(body.companyEmail, "companyEmail");
    const jobTitle = this.requireString(body.jobTitle, "jobTitle");
    const supervisorId = this.requireString(body.supervisorId, "supervisorId");
    const department = this.requireString(body.department, "department");

    return { companyEmail: companyEmail.toLowerCase(), jobTitle, supervisorId, department };
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
}
