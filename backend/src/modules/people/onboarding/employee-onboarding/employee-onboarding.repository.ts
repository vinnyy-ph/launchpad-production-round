import { Prisma } from "@prisma/client";
import { tryExtractNormalizedPhilippinePhone } from "../../../shared/phone";
import { prisma } from "../../../../core/database/prisma.service";
import type {
  CustomFieldValueInputDto,
  UpdateProfileRequestDto,
} from "./dto";

/**
 * Persistence layer for employee self-service onboarding.
 * All Prisma queries for this feature live here.
 */
export class EmployeeOnboardingRepository {
  /**
   * Loads the onboarding record for a user, including template checklist data.
   */
  async findRecordByUserId(userId: string) {
    return prisma.onboardingRecord.findFirst({
      where: {
        employee: { userId },
      },
      include: this.statusInclude,
    });
  }

  /**
   * Loads the onboarding record for an employee (by employee id), including
   * the same template checklist data as {@link findRecordByUserId}. Used by the
   * HR-scoped status endpoint so HR can inspect a specific new hire's progress.
   */
  async findRecordByEmployeeId(employeeId: string) {
    return prisma.onboardingRecord.findFirst({
      where: { employeeId },
      include: this.statusInclude,
    });
  }

  /** Shared relation graph powering the onboarding status DTO. */
  private get statusInclude() {
    return {
      employee: {
        include: {
          department: { select: { name: true } },
          address: { select: { address: true } },
          emergencyContact: { select: { emergencyContactNumber: true } },
        },
      },
      template: {
        include: {
          documents: { orderBy: { createdAt: "asc" } },
          customFields: { orderBy: { createdAt: "asc" } },
        },
      },
      documentSubmissions: {
        orderBy: { submittedAt: "desc" },
        include: {
          document: { select: { id: true, documentName: true } },
        },
      },
      customFieldValues: true,
      invitations: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    } satisfies Prisma.OnboardingRecordInclude;
  }

  /** Finds the latest pending invitation for an onboarding record. */
  async findLatestPendingInvitation(recordId: string) {
    return prisma.onboardingInvitation.findFirst({
      where: {
        recordId,
        status: "PENDING",
      },
      orderBy: { sentAt: "desc" },
    });
  }

  /** Marks an invitation as accepted. */
  async acceptInvitation(invitationId: string) {
    return prisma.onboardingInvitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED" },
    });
  }

  /** Returns true when another employee uses the same emergency contact phone. */
  async emergencyContactPhoneInUse(
    normalizedPhone: string,
    excludeEmployeeId: string,
  ): Promise<boolean> {
    const employees = await prisma.employee.findMany({
      where: {
        id: { not: excludeEmployeeId },
        NOT: { emergencyContact: null },
      },
      select: { emergencyContact: { select: { emergencyContactNumber: true } } },
    });

    return employees.some((employee) => {
      const existingPhone = tryExtractNormalizedPhilippinePhone(
        employee.emergencyContact!.emergencyContactNumber ?? "",
      );

      return existingPhone === normalizedPhone;
    });
  }

  /** Updates the employee profile during onboarding. */
  async updateEmployeeProfile(employeeId: string, dto: UpdateProfileRequestDto) {
    return prisma.employee.update({
      where: { id: employeeId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        personalEmail: dto.personalEmail?.toLowerCase(),
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
        address:
          dto.address === undefined
            ? undefined
            : {
                upsert: {
                  create: { address: dto.address },
                  update: { address: dto.address },
                },
              },
        emergencyContact:
          dto.emergencyContact === undefined
            ? undefined
            : {
                upsert: {
                  create: { emergencyContactNumber: dto.emergencyContact },
                  update: { emergencyContactNumber: dto.emergencyContact },
                },
              },
      },
      include: {
        department: { select: { name: true } },
        address: { select: { address: true } },
        emergencyContact: { select: { emergencyContactNumber: true } },
      },
    });
  }

  /** Finds one required document on the employee's onboarding template. */
  async findTemplateDocument(templateId: string, documentId: string) {
    return prisma.onboardingDocument.findFirst({
      where: {
        id: documentId,
        templateId,
      },
    });
  }

  /** Returns the latest submission for one document on a record. */
  async findLatestSubmission(recordId: string, documentId: string) {
    return prisma.onboardingDocumentSubmission.findFirst({
      where: { recordId, documentId },
      orderBy: { submittedAt: "desc" },
    });
  }

  /** Creates a new document submission for the employee. */
  async createDocumentSubmission(
    recordId: string,
    documentId: string,
    fileUrl: string,
  ) {
    return prisma.onboardingDocumentSubmission.create({
      data: {
        recordId,
        documentId,
        fileUrl,
        status: "PENDING",
      },
      include: {
        document: { select: { documentName: true } },
      },
    });
  }

  /** Finds custom fields on the employee's template by IDs. */
  async findTemplateCustomFields(templateId: string, fieldIds: string[]) {
    return prisma.onboardingCustomField.findMany({
      where: {
        id: { in: fieldIds },
        templateId,
      },
    });
  }

  /** Upserts custom field values for the onboarding record. */
  async upsertCustomFieldValues(
    recordId: string,
    fields: CustomFieldValueInputDto[],
  ) {
    return prisma.$transaction(
      fields.map((field) =>
        prisma.onboardingCustomFieldValue.upsert({
          where: {
            recordId_fieldId: {
              recordId,
              fieldId: field.fieldId,
            },
          },
          update: { value: field.value },
          create: {
            recordId,
            fieldId: field.fieldId,
            value: field.value,
          },
        }),
      ),
    );
  }

  /** Marks onboarding complete and activates the employee. */
  async completeOnboarding(recordId: string, employeeId: string) {
    const completedAt = new Date();

    return prisma.$transaction([
      prisma.onboardingRecord.update({
        where: { id: recordId },
        data: {
          isComplete: true,
          completedAt,
        },
      }),
      prisma.employee.update({
        where: { id: employeeId },
        data: { status: "ACTIVE" },
      }),
    ]);
  }
}
