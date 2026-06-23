import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import { ClearanceTemplatesRepository } from "./clearance-templates.repository";
import type { ClearanceTemplateWithSignatories } from "./clearance-templates.types";
import type {
  ClearanceTemplateDto,
  ClearanceTemplateResponseDto,
  ClearanceTemplateSignatoryInputDto,
  CreateClearanceTemplateRequestDto,
  ListClearanceTemplatesResponseDto,
  UpdateClearanceTemplateRequestDto,
} from "./dto";

/**
 * Business logic for HR-managed clearance versions (templates).
 * A version is a named, ordered list of signatories (employee + purpose + requirements)
 * that offboarding snapshots into signature requests at initiation. Exactly one version
 * may be the default; editing a version never mutates in-flight clearances.
 */
export class ClearanceTemplatesService {
  constructor(
    private readonly clearanceTemplatesRepository = new ClearanceTemplatesRepository(),
  ) {}

  /** Returns every clearance version with its signatories (default first). */
  async listTemplates(): Promise<ListClearanceTemplatesResponseDto> {
    const templates = await this.clearanceTemplatesRepository.findAll();

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_TEMPLATES_RETRIEVED,
      data: templates.map((template) => this.toDto(template)),
    };
  }

  /** Creates a clearance version after asserting every signatory employee exists. */
  async createTemplate(
    dto: CreateClearanceTemplateRequestDto,
  ): Promise<ClearanceTemplateResponseDto> {
    await this.assertSignatoriesExist(dto.signatories);

    const template = await this.clearanceTemplatesRepository.create(
      dto.name,
      dto.isDefault,
      dto.signatories,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_TEMPLATE_CREATED,
      data: this.toDto(template),
    };
  }

  /** Updates a clearance version's name and signatory list. */
  async updateTemplate(
    id: string,
    dto: UpdateClearanceTemplateRequestDto,
  ): Promise<ClearanceTemplateResponseDto> {
    await this.assertTemplateExists(id);
    await this.assertSignatoriesExist(dto.signatories);

    const template = await this.clearanceTemplatesRepository.update(
      id,
      dto.name,
      dto.signatories,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_TEMPLATE_UPDATED,
      data: this.toDto(template),
    };
  }

  /** Sets one clearance version as the default, clearing the flag on the others. */
  async setDefaultTemplate(
    id: string,
  ): Promise<ClearanceTemplateResponseDto> {
    await this.assertTemplateExists(id);

    const template = await this.clearanceTemplatesRepository.setDefault(id);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_TEMPLATE_SET_DEFAULT,
      data: this.toDto(template),
    };
  }

  /**
   * Deletes a clearance version. Blocked when any offboarding case references it,
   * since those records keep a foreign key to the version they were initiated from.
   */
  async deleteTemplate(id: string): Promise<ClearanceTemplateResponseDto> {
    const existing = await this.assertTemplateExists(id);

    if (existing._count.offboardingRecord > 0) {
      throw new Error("Clearance template in use");
    }

    const template = await this.clearanceTemplatesRepository.delete(id);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_TEMPLATE_DELETED,
      data: this.toDto(template),
    };
  }

  /** Loads a version or throws when it does not exist. */
  private async assertTemplateExists(
    id: string,
  ): Promise<ClearanceTemplateWithSignatories> {
    const template = await this.clearanceTemplatesRepository.findById(id);

    if (!template) {
      throw new Error("Clearance template not found");
    }

    return template;
  }

  /** Asserts every signatory references an existing employee. */
  private async assertSignatoriesExist(
    signatories: ClearanceTemplateSignatoryInputDto[],
  ): Promise<void> {
    const employeeIds = signatories.map((signatory) => signatory.employeeId);
    const existing =
      await this.clearanceTemplatesRepository.findExistingEmployeeIds(
        employeeIds,
      );

    if (existing.length !== new Set(employeeIds).size) {
      throw new Error("Signatory not found");
    }
  }

  /** Maps a persisted version (with signatories) to the response DTO. */
  private toDto(template: ClearanceTemplateWithSignatories): ClearanceTemplateDto {
    return {
      id: template.id,
      name: template.name,
      isDefault: template.isDefault,
      inUseCount: template._count.offboardingRecord,
      signatories: template.signatories.map((signatory) => ({
        id: signatory.id,
        employee: {
          id: signatory.employee.id,
          firstName: signatory.employee.firstName,
          lastName: signatory.employee.lastName,
          jobTitle: signatory.employee.jobTitle,
        },
        purpose: signatory.purpose,
        requirements: signatory.requirements,
        order: signatory.order,
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }
}
