import { prisma } from "../../../../core/database/prisma.service";
import type {
  CreateCustomFieldRequestDto,
  UpdateCustomFieldRequestDto,
} from "./dto";
import { DEFAULT_TEMPLATE_NAME } from "./custom-fields.constants";

/**
 * Persistence layer for onboarding custom fields on the default template.
 */
export class CustomFieldsRepository {
  /**
   * Returns the default onboarding template, creating it when missing.
   */
  async ensureDefaultTemplate() {
    const existing = await prisma.onboardingTemplate.findFirst({
      where: { isDefault: true },
    });

    if (existing) {
      return existing;
    }

    return prisma.onboardingTemplate.create({
      data: {
        name: DEFAULT_TEMPLATE_NAME,
        isDefault: true,
      },
    });
  }

  /**
   * Lists all custom fields on the default onboarding template.
   */
  async findAllOnDefaultTemplate() {
    const template = await this.ensureDefaultTemplate();

    return prisma.onboardingCustomField.findMany({
      where: { templateId: template.id },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Finds a custom field by ID on the default template.
   */
  async findByIdOnDefaultTemplate(id: string) {
    const template = await this.ensureDefaultTemplate();

    return prisma.onboardingCustomField.findFirst({
      where: {
        id,
        templateId: template.id,
      },
    });
  }

  /**
   * Creates a custom field on the default onboarding template.
   */
  async createOnDefaultTemplate(dto: CreateCustomFieldRequestDto) {
    const template = await this.ensureDefaultTemplate();

    return prisma.onboardingCustomField.create({
      data: {
        templateId: template.id,
        fieldLabel: dto.fieldLabel,
        isRequired: dto.isRequired ?? false,
      },
    });
  }

  /**
   * Updates a custom field on the default onboarding template.
   */
  async updateOnDefaultTemplate(id: string, dto: UpdateCustomFieldRequestDto) {
    return prisma.onboardingCustomField.update({
      where: { id },
      data: {
        fieldLabel: dto.fieldLabel,
        isRequired: dto.isRequired ?? false,
      },
    });
  }

  /**
   * Deletes a custom field from the default onboarding template.
   */
  async deleteOnDefaultTemplate(id: string) {
    return prisma.onboardingCustomField.delete({
      where: { id },
    });
  }
}
