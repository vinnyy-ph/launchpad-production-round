import { parseEmergencyContact } from "../../../shared/phone";
import type {
  SubmitCustomFieldsRequestDto,
  SubmitDocumentParamsDto,
  SubmitDocumentRequestDto,
  UpdateProfileRequestDto,
} from "./dto";
import { EMPLOYEE_ONBOARDING_FIELDS } from "./employee-onboarding.constants";

/**
 * Validates and normalizes employee self-service onboarding API payloads.
 */
export class EmployeeOnboardingValidation {
  /**
   * Validates PATCH /api/v1/employee-onboarding/profile request body.
   */
  parseUpdateProfileBody(body: Record<string, unknown>): UpdateProfileRequestDto {
    const dto: UpdateProfileRequestDto = {};

    const firstName = this.optionalString(body.firstName);
    const lastName = this.optionalString(body.lastName);
    const middleName = this.optionalNullableString(body.middleName);
    const personalEmail = this.optionalString(body.personalEmail);
    const birthday = this.optionalDate(body.birthday);
    const address = this.optionalString(body.address);
    const emergencyContact = this.optionalEmergencyContact(body.emergencyContact);

    if (firstName !== undefined) {
      dto.firstName = firstName;
    }

    if (lastName !== undefined) {
      dto.lastName = lastName;
    }

    if (middleName !== undefined) {
      dto.middleName = middleName;
    }

    if (personalEmail !== undefined) {
      dto.personalEmail = personalEmail.toLowerCase();
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

    if (Object.keys(dto).length === 0) {
      throw new Error("Profile update body is required");
    }

    return dto;
  }

  /**
   * Validates POST /api/v1/employee-onboarding/custom-fields request body.
   */
  parseSubmitCustomFieldsBody(
    body: Record<string, unknown>,
  ): SubmitCustomFieldsRequestDto {
    if (!Array.isArray(body.fields)) {
      throw new Error(`${EMPLOYEE_ONBOARDING_FIELDS.FIELDS} is required`);
    }

    if (body.fields.length === 0) {
      throw new Error(`${EMPLOYEE_ONBOARDING_FIELDS.FIELDS} is required`);
    }

    const fields = body.fields.map((item, index) => {
      if (typeof item !== "object" || item === null) {
        throw new Error(`Invalid field at index ${index}`);
      }

      const field = item as Record<string, unknown>;
      const fieldId = this.requireString(
        field.fieldId,
        EMPLOYEE_ONBOARDING_FIELDS.FIELD_ID,
      );
      const value = this.requireString(
        field.value,
        EMPLOYEE_ONBOARDING_FIELDS.VALUE,
      );

      return { fieldId, value };
    });

    return { fields };
  }

  /**
   * Validates route params for document submission.
   */
  parseSubmitDocumentParams(
    params: Record<string, unknown>,
  ): SubmitDocumentParamsDto {
    const documentId = this.requireString(
      params.documentId,
      EMPLOYEE_ONBOARDING_FIELDS.DOCUMENT_ID,
    );

    return { documentId };
  }

  /**
   * Validates POST /api/v1/employee-onboarding/documents/:documentId/submit body.
   */
  parseSubmitDocumentBody(
    body: Record<string, unknown>,
  ): SubmitDocumentRequestDto {
    const fileUrl = this.requireString(
      body.fileUrl,
      EMPLOYEE_ONBOARDING_FIELDS.FILE_URL,
    );

    if (!this.isValidUrl(fileUrl)) {
      throw new Error("Invalid fileUrl");
    }

    return { fileUrl };
  }

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

  private optionalNullableString(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

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

    return trimmed;
  }

  private isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);

      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
}
