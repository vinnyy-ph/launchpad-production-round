import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import type {
  CreateCustomFieldRequestDto,
  CustomFieldDto,
  CustomFieldResponseDto,
  ListCustomFieldsResponseDto,
  UpdateCustomFieldRequestDto,
} from "./dto";
import { CustomFieldsRepository } from "./custom-fields.repository";

type CustomFieldRecord = Awaited<
  ReturnType<CustomFieldsRepository["findByIdOnDefaultTemplate"]>
>;

/**
 * Business logic for HR-managed onboarding custom fields.
 */
export class CustomFieldsService {
  constructor(
    private readonly customFieldsRepository = new CustomFieldsRepository(),
  ) {}

  /**
   * Creates a new custom field on the default onboarding template.
   */
  async createCustomField(
    dto: CreateCustomFieldRequestDto,
  ): Promise<CustomFieldResponseDto> {
    const customField =
      await this.customFieldsRepository.createOnDefaultTemplate(dto);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CUSTOM_FIELD_CREATED,
      data: this.toCustomFieldDto(customField),
    };
  }

  /**
   * Returns all custom fields configured for onboarding.
   */
  async listCustomFields(): Promise<ListCustomFieldsResponseDto> {
    const customFields =
      await this.customFieldsRepository.findAllOnDefaultTemplate();

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CUSTOM_FIELDS_RETRIEVED,
      data: customFields.map((customField) =>
        this.toCustomFieldDto(customField),
      ),
    };
  }

  /**
   * Returns one custom field by ID.
   */
  async getCustomField(id: string): Promise<CustomFieldResponseDto> {
    const customField =
      await this.customFieldsRepository.findByIdOnDefaultTemplate(id);

    if (!customField) {
      throw new Error("Custom field not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CUSTOM_FIELD_RETRIEVED,
      data: this.toCustomFieldDto(customField),
    };
  }

  /**
   * Updates an existing custom field.
   */
  async updateCustomField(
    id: string,
    dto: UpdateCustomFieldRequestDto,
  ): Promise<CustomFieldResponseDto> {
    const existing =
      await this.customFieldsRepository.findByIdOnDefaultTemplate(id);

    if (!existing) {
      throw new Error("Custom field not found");
    }

    const customField =
      await this.customFieldsRepository.updateOnDefaultTemplate(id, dto);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CUSTOM_FIELD_UPDATED,
      data: this.toCustomFieldDto(customField),
    };
  }

  /**
   * Removes a custom field from the onboarding template.
   */
  async deleteCustomField(id: string): Promise<CustomFieldResponseDto> {
    const existing =
      await this.customFieldsRepository.findByIdOnDefaultTemplate(id);

    if (!existing) {
      throw new Error("Custom field not found");
    }

    const customField =
      await this.customFieldsRepository.deleteOnDefaultTemplate(id);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CUSTOM_FIELD_DELETED,
      data: this.toCustomFieldDto(customField),
    };
  }

  private toCustomFieldDto(
    customField: NonNullable<CustomFieldRecord>,
  ): CustomFieldDto {
    return {
      id: customField.id,
      fieldLabel: customField.fieldLabel,
      isRequired: customField.isRequired,
      createdAt: customField.createdAt.toISOString(),
      updatedAt: customField.updatedAt.toISOString(),
    };
  }
}
