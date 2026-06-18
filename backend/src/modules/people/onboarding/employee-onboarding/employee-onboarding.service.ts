import type { DocumentStatus, InviteStatus, User } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import type {
  AcceptInvitationResponseDto,
  CompleteOnboardingResponseDto,
  OnboardingCustomFieldStatusDto,
  OnboardingDocumentStatusDto,
  OnboardingProfileDto,
  OnboardingStatusDataDto,
  OnboardingStatusResponseDto,
  SubmitCustomFieldsRequestDto,
  SubmitCustomFieldsResponseDto,
  SubmitDocumentParamsDto,
  SubmitDocumentRequestDto,
  SubmitDocumentResponseDto,
  UpdateProfileRequestDto,
  UpdateProfileResponseDto,
} from "./dto";
import { REQUIRED_PROFILE_FIELDS } from "./employee-onboarding.constants";
import { EmployeeOnboardingRepository } from "./employee-onboarding.repository";
import { NotificationsService } from "../../../notifications/notifications.service";

type OnboardingRecordWithRelations = NonNullable<
  Awaited<ReturnType<EmployeeOnboardingRepository["findRecordByUserId"]>>
>;

/**
 * Orchestrates employee self-service onboarding workflows.
 */
export class EmployeeOnboardingService {
  constructor(
    private readonly employeeOnboardingRepository = new EmployeeOnboardingRepository(),
    private readonly notificationsService = new NotificationsService(),
  ) {}

  /**
   * Accepts the employee's pending onboarding invitation and returns the checklist.
   */
  async acceptInvitation(user: User): Promise<AcceptInvitationResponseDto> {
    const record = await this.requireRecord(user);

    if (record.isComplete) {
      throw new Error("Onboarding already complete");
    }

    const invitation = await this.employeeOnboardingRepository.findLatestPendingInvitation(
      record.id,
    );

    if (!invitation) {
      const latestInvitation = record.invitations[0];

      if (latestInvitation?.status === "ACCEPTED") {
        return {
          success: true,
          message: API_SUCCESS_MESSAGES.INVITATION_ACCEPTED,
          data: this.toStatusData(record, "accepted"),
        };
      }

      throw new Error("Invitation not found");
    }

    if (this.isInvitationExpired(invitation.expiresAt)) {
      throw new Error("Invitation expired");
    }

    await this.employeeOnboardingRepository.acceptInvitation(invitation.id);

    const refreshed = await this.employeeOnboardingRepository.findRecordByUserId(
      user.id,
    );

    if (!refreshed) {
      throw new Error("Employee onboarding not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.INVITATION_ACCEPTED,
      data: this.toStatusData(refreshed, "accepted"),
    };
  }

  /**
   * Returns the employee's full onboarding checklist and progress.
   */
  async getStatus(user: User): Promise<OnboardingStatusResponseDto> {
    const record = await this.requireRecord(user);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.ONBOARDING_STATUS_RETRIEVED,
      data: this.toStatusData(record),
    };
  }

  /**
   * Updates the employee profile during onboarding.
   */
  async updateProfile(
    user: User,
    dto: UpdateProfileRequestDto,
  ): Promise<UpdateProfileResponseDto> {
    const record = await this.requireActiveRecord(user);

    if (dto.emergencyContactNormalizedPhone) {
      const phoneInUse =
        await this.employeeOnboardingRepository.emergencyContactPhoneInUse(
          dto.emergencyContactNormalizedPhone,
          record.employee.id,
        );

      if (phoneInUse) {
        throw new Error("Emergency contact phone number is already in use");
      }
    }

    const employee = await this.employeeOnboardingRepository.updateEmployeeProfile(
      record.employee.id,
      dto,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.ONBOARDING_PROFILE_UPDATED,
      data: this.toProfileDto(employee),
    };
  }

  /**
   * Saves custom field answers for the employee's onboarding record.
   */
  async submitCustomFields(
    user: User,
    dto: SubmitCustomFieldsRequestDto,
  ): Promise<SubmitCustomFieldsResponseDto> {
    const record = await this.requireActiveRecord(user);
    const fieldIds = dto.fields.map((field) => field.fieldId);
    const templateFields =
      await this.employeeOnboardingRepository.findTemplateCustomFields(
        record.templateId,
        fieldIds,
      );

    if (templateFields.length !== fieldIds.length) {
      throw new Error("Custom field not found");
    }

    await this.employeeOnboardingRepository.upsertCustomFieldValues(
      record.id,
      dto.fields,
    );

    const refreshed = await this.employeeOnboardingRepository.findRecordByUserId(
      user.id,
    );

    if (!refreshed) {
      throw new Error("Employee onboarding not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CUSTOM_FIELD_VALUES_SAVED,
      data: this.toCustomFieldStatuses(refreshed),
    };
  }

  /**
   * Submits or re-submits a required onboarding document.
   */
  async submitDocument(
    user: User,
    params: SubmitDocumentParamsDto,
    dto: SubmitDocumentRequestDto,
  ): Promise<SubmitDocumentResponseDto> {
    const record = await this.requireActiveRecord(user);
    const document = await this.employeeOnboardingRepository.findTemplateDocument(
      record.templateId,
      params.documentId,
    );

    if (!document) {
      throw new Error("Document not found");
    }

    this.validateFileType(dto.fileUrl, document.allowedFileTypes);

    const latestSubmission =
      await this.employeeOnboardingRepository.findLatestSubmission(
        record.id,
        params.documentId,
      );

    if (latestSubmission) {
      if (latestSubmission.status === "PENDING") {
        throw new Error("Document submission not allowed");
      }

      if (latestSubmission.status === "APPROVED") {
        throw new Error("Document submission not allowed");
      }
    }

    const submission = await this.employeeOnboardingRepository.createDocumentSubmission(
      record.id,
      params.documentId,
      dto.fileUrl,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENT_SUBMITTED,
      data: {
        id: submission.id,
        documentId: submission.documentId,
        documentName: submission.document.documentName,
        fileUrl: submission.fileUrl,
        status: this.toDocumentStatusDto(submission.status),
        rejectionNote: submission.rejectionNote,
        submittedAt: submission.submittedAt.toISOString(),
        reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      },
    };
  }

  /**
   * Marks onboarding complete when all requirements are satisfied.
   */
  async completeOnboarding(user: User): Promise<CompleteOnboardingResponseDto> {
    const record = await this.requireActiveRecord(user);

    this.assertProfileComplete(record.employee);
    this.assertCustomFieldsComplete(record);
    this.assertDocumentsComplete(record);

    const completedAt = new Date();

    await this.employeeOnboardingRepository.completeOnboarding(
      record.id,
      record.employee.id,
    );

    await this.notificationsService.notifyHrOnboardingComplete(
      `${record.employee.firstName} ${record.employee.lastName}`,
      record.employee.id,
    );

    if (record.employee.supervisorId) {
      await this.notificationsService.notifySupervisorOnboardingComplete(
        `${record.employee.firstName} ${record.employee.lastName}`,
        record.employee.id,
        record.employee.supervisorId,
      );
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.ONBOARDING_COMPLETED,
      data: {
        recordId: record.id,
        isComplete: true,
        completedAt: completedAt.toISOString(),
        employeeStatus: "active",
      },
    };
  }

  /** Loads the onboarding record or throws when the employee has none. */
  private async requireRecord(user: User): Promise<OnboardingRecordWithRelations> {
    const record = await this.employeeOnboardingRepository.findRecordByUserId(
      user.id,
    );

    if (!record) {
      throw new Error("Employee onboarding not found");
    }

    return record;
  }

  /** Loads an in-progress onboarding record. */
  private async requireActiveRecord(
    user: User,
  ): Promise<OnboardingRecordWithRelations> {
    const record = await this.requireRecord(user);

    if (record.isComplete) {
      throw new Error("Onboarding already complete");
    }

    return record;
  }

  /** Ensures required profile fields are filled before completion. */
  private assertProfileComplete(employee: OnboardingRecordWithRelations["employee"]) {
    const missingField = REQUIRED_PROFILE_FIELDS.find((field) => {
      switch (field) {
        case "firstName":
          return !employee.firstName?.trim();
        case "lastName":
          return !employee.lastName?.trim();
        case "personalEmail":
          return !employee.personalEmail?.trim();
        case "birthday":
          return !employee.birthday;
        case "address":
          return !employee.address?.trim();
        case "emergencyContact":
          return !employee.emergencyContact?.trim();
        default:
          return false;
      }
    });

    if (missingField) {
      throw new Error("Onboarding incomplete");
    }
  }

  /** Ensures all required custom fields have values. */
  private assertCustomFieldsComplete(record: OnboardingRecordWithRelations) {
    const requiredFields = record.template.customFields.filter(
      (field) => field.isRequired,
    );

    const missingField = requiredFields.find((field) => {
      const value = record.customFieldValues.find(
        (entry) => entry.fieldId === field.id,
      );

      return !value?.value.trim();
    });

    if (missingField) {
      throw new Error("Onboarding incomplete");
    }
  }

  /** Ensures all required documents have a pending or approved submission. */
  private assertDocumentsComplete(record: OnboardingRecordWithRelations) {
    const requiredDocuments = record.template.documents.filter(
      (document) => document.isRequired,
    );

    const missingDocument = requiredDocuments.find((document) => {
      const latestSubmission = record.documentSubmissions.find(
        (submission) => submission.documentId === document.id,
      );

      return (
        !latestSubmission ||
        latestSubmission.status === "REJECTED" ||
        (latestSubmission.status !== "PENDING" &&
          latestSubmission.status !== "APPROVED")
      );
    });

    if (missingDocument) {
      throw new Error("Onboarding incomplete");
    }
  }

  /** Validates the uploaded file extension against the document checklist. */
  private validateFileType(fileUrl: string, allowedFileTypes: string) {
    const extension = this.extractFileExtension(fileUrl);
    const allowed = allowedFileTypes
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    if (!extension || !allowed.includes(extension)) {
      throw new Error("Invalid file type");
    }
  }

  private extractFileExtension(fileUrl: string): string | null {
    const pathname = new URL(fileUrl).pathname;
    const parts = pathname.split(".");
    const extension = parts[parts.length - 1]?.toLowerCase();

    return extension && extension.length > 0 ? extension : null;
  }

  private isInvitationExpired(expiresAt: Date): boolean {
    return expiresAt.getTime() < Date.now();
  }

  private toStatusData(
    record: OnboardingRecordWithRelations,
    invitationStatusOverride?: ReturnType<
      typeof this.toInvitationStatusDto
    >,
  ): OnboardingStatusDataDto {
    const latestInvitation = record.invitations[0];

    return {
      recordId: record.id,
      isComplete: record.isComplete,
      completedAt: record.completedAt?.toISOString() ?? null,
      invitationStatus:
        invitationStatusOverride ??
        (latestInvitation
          ? this.resolveInvitationStatus(latestInvitation.status, latestInvitation.expiresAt)
          : null),
      profile: this.toProfileDto(record.employee),
      documents: this.toDocumentStatuses(record),
      customFields: this.toCustomFieldStatuses(record),
    };
  }

  private toProfileDto(
    employee: OnboardingRecordWithRelations["employee"],
  ): OnboardingProfileDto {
    return {
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName,
      personalEmail: employee.personalEmail,
      birthday: employee.birthday?.toISOString() ?? null,
      address: employee.address,
      emergencyContact: employee.emergencyContact,
      jobTitle: employee.jobTitle,
      department: employee.department?.name ?? null,
    };
  }

  private toDocumentStatuses(
    record: OnboardingRecordWithRelations,
  ): OnboardingDocumentStatusDto[] {
    return record.template.documents.map((document) => {
      const latestSubmission = record.documentSubmissions.find(
        (submission) => submission.documentId === document.id,
      );

      return {
        id: document.id,
        documentName: document.documentName,
        instructions: document.instructions,
        allowedFileTypes: document.allowedFileTypes,
        isRequired: document.isRequired,
        latestSubmission: latestSubmission
          ? {
              id: latestSubmission.id,
              fileUrl: latestSubmission.fileUrl,
              status: this.toDocumentStatusDto(latestSubmission.status),
              rejectionNote: latestSubmission.rejectionNote,
              submittedAt: latestSubmission.submittedAt.toISOString(),
              reviewedAt: latestSubmission.reviewedAt?.toISOString() ?? null,
            }
          : null,
      };
    });
  }

  private toCustomFieldStatuses(
    record: OnboardingRecordWithRelations,
  ): OnboardingCustomFieldStatusDto[] {
    return record.template.customFields.map((field) => {
      const value = record.customFieldValues.find(
        (entry) => entry.fieldId === field.id,
      );

      return {
        id: field.id,
        fieldLabel: field.fieldLabel,
        isRequired: field.isRequired,
        value: value?.value ?? null,
      };
    });
  }

  private resolveInvitationStatus(
    status: InviteStatus,
    expiresAt: Date,
  ): "pending" | "accepted" | "expired" | "failed_delivery" {
    if (status === "PENDING" && this.isInvitationExpired(expiresAt)) {
      return "expired";
    }

    return this.toInvitationStatusDto(status);
  }

  private toInvitationStatusDto(
    status: InviteStatus,
  ): "pending" | "accepted" | "expired" | "failed_delivery" {
    return status.toLowerCase() as
      | "pending"
      | "accepted"
      | "expired"
      | "failed_delivery";
  }

  private toDocumentStatusDto(
    status: DocumentStatus,
  ): "pending" | "approved" | "rejected" {
    return status.toLowerCase() as "pending" | "approved" | "rejected";
  }
}
