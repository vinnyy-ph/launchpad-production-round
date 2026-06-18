import { parseEmergencyContact } from "../../shared/phone";
import type {
  HrCompleteOnboardingParamsDto,
  OnboardEmployeeRequestDto,
} from "./dto";

/**
 * Parses and validates the onboard-employee request body.
 * Throws descriptive errors when required fields are missing or empty.
 */
export class OnboardingValidation {
  /**
   * Validates required onboarding fields and optional HR pre-fill profile fields.
   * Returns a typed DTO when validation succeeds.
   */
  parseOnboardBody(body: Record<string, unknown>): OnboardEmployeeRequestDto {
    const companyEmail = this.requireString(body.companyEmail, "companyEmail");
    const jobTitle = this.requireString(body.jobTitle, "jobTitle");
    const supervisorId = this.requireString(body.supervisorId, "supervisorId");
    const department = this.requireString(body.department, "department");

    const dto: OnboardEmployeeRequestDto = {
      companyEmail: companyEmail.toLowerCase(),
      jobTitle,
      supervisorId,
      department,
    };

    const personalEmail = this.optionalString(body.personalEmail);
    const firstName = this.optionalString(body.firstName);
    const middleName = this.optionalString(body.middleName);
    const lastName = this.optionalString(body.lastName);
    const birthday = this.optionalDate(body.birthday);
    const address = this.optionalString(body.address);
    const emergencyContact = this.optionalEmergencyContact(body.emergencyContact);

    if (personalEmail !== undefined) {
      dto.personalEmail = personalEmail.toLowerCase();
    }

    if (firstName !== undefined) {
      dto.firstName = firstName;
    }

    if (middleName !== undefined) {
      dto.middleName = middleName;
    }

    if (lastName !== undefined) {
      dto.lastName = lastName;
    }

    if (birthday !== undefined) {
      dto.birthday = birthday;
    }

    if (address !== undefined) {
      dto.address = address;
    }

    if (emergencyContact !== undefined) {
      dto.emergencyContact = emergencyContact.displayValue;
      dto.emergencyContactNormalizedPhone = emergencyContact.normalizedPhone;
    }

    return dto;
  }

  /** Validates the employeeId route param for HR onboarding completion. */
  parseCompleteParams(params: Record<string, unknown>): HrCompleteOnboardingParamsDto {
    return {
      employeeId: this.requireString(params.employeeId, "employeeId"),
    };
  }

  /** Validates the employeeId route param for the HR-scoped status read. */
  parseStatusParams(params: Record<string, unknown>): HrCompleteOnboardingParamsDto {
    return {
      employeeId: this.requireString(params.employeeId, "employeeId"),
    };
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

  /** Returns a trimmed string when provided and non-empty; otherwise undefined. */
  private optionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return undefined;
    }

    return trimmed;
  }

  /** Validates optional emergency contact with a Philippine mobile number. */
  private optionalEmergencyContact(value: unknown) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new Error("Invalid emergency contact phone number");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return undefined;
    }

    return parseEmergencyContact(trimmed);
  }

  /** Validates an optional ISO date string or throws when the value is invalid. */
  private optionalDate(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new Error("Invalid birthday");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid birthday");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthdayDate = new Date(parsed);
    birthdayDate.setHours(0, 0, 0, 0);

    if (birthdayDate > today) {
      throw new Error("Invalid birthday");
    }

    return trimmed;
  }
}
