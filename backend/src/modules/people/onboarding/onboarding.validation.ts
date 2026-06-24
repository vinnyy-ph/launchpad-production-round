import { formatPhilippineMobileDisplay, parseEmergencyContact } from "../../shared/phone";
import { assertSafeText } from "../../../core/validation/text-input";
import { PEOPLE_TEXT_LIMITS } from "../people-text-limits";
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

    assertSafeText(companyEmail, "companyEmail", PEOPLE_TEXT_LIMITS.EMAIL);
    assertSafeText(jobTitle, "jobTitle", PEOPLE_TEXT_LIMITS.JOB_TITLE);
    assertSafeText(department, "department", PEOPLE_TEXT_LIMITS.DEPARTMENT_NAME);

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
    const city = this.optionalString(body.city);
    const province = this.optionalString(body.province);
    const country = this.optionalString(body.country);
    const emergencyContactName = this.optionalString(body.emergencyContactName);
    const emergencyContact = this.optionalEmergencyContact(body.emergencyContact);

    if (personalEmail !== undefined) {
      assertSafeText(personalEmail, "personalEmail", PEOPLE_TEXT_LIMITS.EMAIL);
      dto.personalEmail = personalEmail.toLowerCase();
    }

    if (firstName !== undefined) {
      assertSafeText(firstName, "firstName", PEOPLE_TEXT_LIMITS.NAME);
      dto.firstName = firstName;
    }

    if (middleName !== undefined) {
      assertSafeText(middleName, "middleName", PEOPLE_TEXT_LIMITS.NAME);
      dto.middleName = middleName;
    }

    if (lastName !== undefined) {
      assertSafeText(lastName, "lastName", PEOPLE_TEXT_LIMITS.NAME);
      dto.lastName = lastName;
    }

    if (birthday !== undefined) {
      dto.birthday = birthday;
    }

    if (address !== undefined) {
      assertSafeText(address, "address", PEOPLE_TEXT_LIMITS.ADDRESS_LINE);
      dto.address = address;
    }

    if (city !== undefined) {
      assertSafeText(city, "city", PEOPLE_TEXT_LIMITS.LOCATION);
      dto.city = city;
    }

    if (province !== undefined) {
      assertSafeText(province, "province", PEOPLE_TEXT_LIMITS.LOCATION);
      dto.province = province;
    }

    if (country !== undefined) {
      assertSafeText(country, "country", PEOPLE_TEXT_LIMITS.LOCATION);
      dto.country = country;
    }

    if (emergencyContact !== undefined) {
      dto.emergencyContact = formatPhilippineMobileDisplay(emergencyContact.normalizedPhone);
      const contactName = emergencyContactName ?? emergencyContact.contactName ?? undefined;
      if (contactName !== undefined) {
        assertSafeText(contactName, "emergencyContactName", PEOPLE_TEXT_LIMITS.NAME);
      }
      dto.emergencyContactName = contactName;
      dto.emergencyContactNormalizedPhone = emergencyContact.normalizedPhone;
    } else if (emergencyContactName !== undefined) {
      assertSafeText(emergencyContactName, "emergencyContactName", PEOPLE_TEXT_LIMITS.NAME);
      dto.emergencyContactName = emergencyContactName;
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
