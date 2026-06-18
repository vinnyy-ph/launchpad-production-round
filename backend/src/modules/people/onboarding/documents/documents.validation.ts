import type {
  CreateDocumentRequestDto,
  GetDocumentParamsDto,
  UpdateDocumentRequestDto,
} from "./dto";
import {
  ALLOWED_FILE_EXTENSIONS,
  DOCUMENT_FIELDS,
} from "./documents.constants";

/**
 * Validates and normalizes incoming required-documents API payloads.
 */
export class DocumentsValidation {
  /**
   * Validates POST /api/v1/onboarding/documents request body.
   */
  parseCreateBody(body: Record<string, unknown>): CreateDocumentRequestDto {
    const documentName = this.parseRequiredString(
      body.documentName,
      DOCUMENT_FIELDS.DOCUMENT_NAME,
    );
    const instructions = this.parseOptionalString(body.instructions);
    const allowedFileTypes = this.parseAllowedFileTypes(body.allowedFileTypes);
    const isRequired = this.parseOptionalBoolean(body.isRequired) ?? true;

    return {
      documentName,
      instructions,
      allowedFileTypes,
      isRequired,
    };
  }

  /**
   * Validates PUT /api/v1/onboarding/documents/:id request body.
   */
  parseUpdateBody(body: Record<string, unknown>): UpdateDocumentRequestDto {
    return this.parseCreateBody(body);
  }

  /**
   * Validates route params for document-specific endpoints.
   */
  parseDocumentIdParam(params: Record<string, unknown>): GetDocumentParamsDto {
    const id = this.parseRequiredString(params.id, DOCUMENT_FIELDS.ID);

    return { id };
  }

  private parseAllowedFileTypes(value: unknown): string {
    const raw = this.parseRequiredString(
      value,
      DOCUMENT_FIELDS.ALLOWED_FILE_TYPES,
    );

    const extensions = raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    if (extensions.length === 0) {
      throw new Error(`Invalid ${DOCUMENT_FIELDS.ALLOWED_FILE_TYPES}`);
    }

    const invalidExtension = extensions.find(
      (extension) =>
        !ALLOWED_FILE_EXTENSIONS.includes(
          extension as (typeof ALLOWED_FILE_EXTENSIONS)[number],
        ),
    );

    if (invalidExtension) {
      throw new Error(`Invalid ${DOCUMENT_FIELDS.ALLOWED_FILE_TYPES}`);
    }

    return [...new Set(extensions)].join(",");
  }

  private parseRequiredString(value: unknown, fieldName: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${fieldName} is required`);
    }

    return value.trim();
  }

  private parseOptionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new Error(`Invalid ${DOCUMENT_FIELDS.INSTRUCTIONS}`);
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
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

    throw new Error(`Invalid ${DOCUMENT_FIELDS.IS_REQUIRED}`);
  }
}
