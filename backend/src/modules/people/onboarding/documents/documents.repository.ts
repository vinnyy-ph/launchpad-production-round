import { prisma } from "../../../../core/database/prisma.service";
import type { CreateDocumentRequestDto, UpdateDocumentRequestDto } from "./dto";
import { DEFAULT_TEMPLATE_NAME } from "./documents.constants";

/**
 * Persistence layer for required onboarding documents on the default template.
 */
export class DocumentsRepository {
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
   * Lists all required documents on the default onboarding template.
   */
  async findAllOnDefaultTemplate() {
    const template = await this.ensureDefaultTemplate();

    return prisma.onboardingDocument.findMany({
      where: { templateId: template.id },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Finds a required document by ID on the default template.
   */
  async findByIdOnDefaultTemplate(id: string) {
    const template = await this.ensureDefaultTemplate();

    return prisma.onboardingDocument.findFirst({
      where: {
        id,
        templateId: template.id,
      },
    });
  }

  /**
   * Creates a required document on the default onboarding template.
   */
  async createOnDefaultTemplate(dto: CreateDocumentRequestDto) {
    const template = await this.ensureDefaultTemplate();

    return prisma.onboardingDocument.create({
      data: {
        templateId: template.id,
        documentName: dto.documentName,
        instructions: dto.instructions ?? null,
        allowedFileTypes: dto.allowedFileTypes,
        isRequired: dto.isRequired ?? true,
      },
    });
  }

  /**
   * Updates a required document on the default onboarding template.
   */
  async updateOnDefaultTemplate(id: string, dto: UpdateDocumentRequestDto) {
    return prisma.onboardingDocument.update({
      where: { id },
      data: {
        documentName: dto.documentName,
        instructions: dto.instructions ?? null,
        allowedFileTypes: dto.allowedFileTypes,
        isRequired: dto.isRequired ?? true,
      },
    });
  }

  /**
   * Deletes a required document from the default onboarding template, along with
   * any submissions already uploaded for it on existing onboarding records. Done
   * in a transaction so the document and its submissions are removed atomically —
   * without clearing the submissions first the foreign key would block the delete.
   */
  async deleteOnDefaultTemplate(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.onboardingDocumentSubmission.deleteMany({ where: { documentId: id } });
      return tx.onboardingDocument.delete({ where: { id } });
    });
  }
}
