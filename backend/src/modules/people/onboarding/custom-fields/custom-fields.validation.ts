import type {
  CreateCustomFieldRequestDto,
  GetCustomFieldParamsDto,
  UpdateCustomFieldRequestDto,
} from "./dto";
import { CUSTOM_FIELD_FIELDS } from "./custom-fields.constants";

/**
 * Validates and normalizes incoming custom-fields API payloads.
 */
export class CustomFieldsValidation {
  /**
   * Validates POST /api/v1/onboarding/custom-fields request body.
   */
  parseCreateBody(body: Record<string, unknown>): CreateCustomFieldRequestDto {
    const fieldLabel = this.parseRequiredString(
      body.fieldLabel,
      CUSTOM_FIELD_FIELDS.FIELD_LABEL,
    );
    const isRequired = this.parseOptionalBoolean(body.isRequired) ?? false;

    return {
      fieldLabel,
      isRequired,
    };
  }

  /**
   * Validates PUT /api/v1/onboarding/custom-fields/:id request body.
   */
  parseUpdateBody(body: Record<string, unknown>): UpdateCustomFieldRequestDto {
    return this.parseCreateBody(body);
  }

  /**
   * Validates route params for custom-field-specific endpoints.
   */
  parseCustomFieldIdParam(
    params: Record<string, unknown>,
  ): GetCustomFieldParamsDto {
    const id = this.parseRequiredString(params.id, CUSTOM_FIELD_FIELDS.ID);

    return { id };
  }

  private parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${fieldName} is required`);
    }

    return value.trim();
  }

  private parseOptionalBoolean(value: unknown): boolean | undefined {
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

    throw new Error(`Invalid ${CUSTOM_FIELD_FIELDS.IS_REQUIRED}`);
  }
}
