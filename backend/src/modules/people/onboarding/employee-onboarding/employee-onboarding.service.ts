import type { DocumentStatus, InviteStatus, User } from "@prisma/client";
import type { Express } from "express";
import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import { CloudinaryService } from "../../../../core/cloudinary";
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
  SubmitDocumentResponseDto,
  UpdateProfileRequestDto,
  UpdateProfileResponseDto,
} from "./dto";
import { REQUIRED_PROFILE_FIELDS } from "./employee-onboarding.constants";
import { validateOnboardingUploadFile } from "./onboarding-file-validation";
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
    private readonly cloudinaryService = new CloudinaryService(),
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

    return this.toStatusResponse(record);
  }

  /**
   * Returns one employee's onboarding checklist for an HR/Admin viewer.
   * Shares the same status builder as the employee-scoped {@link getStatus}; the
   * only difference is the record is located by employee id rather than session.
   */
  async getStatusByEmployeeId(
    employeeId: string,
  ): Promise<OnboardingStatusResponseDto> {
    const record =
      await this.employeeOnboardingRepository.findRecordByEmployeeId(employeeId);

    if (!record) {
      throw new Error("Onboarding record not found");
    }

    return this.toStatusResponse(record);
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
   * Uploads a required onboarding document via Cloudinary and records the submission.
   */
  async submitDocument(
    user: User,
    params: SubmitDocumentParamsDto,
    file: Express.Multer.File,
  ): Promise<SubmitDocumentResponseDto> {
    const record = await this.requireActiveRecord(user);
    const document = await this.employeeOnboardingRepository.findTemplateDocument(
      record.templateId,
      params.documentId,
    );

    if (!document) {
      throw new Error("Document not found");
    }

    validateOnboardingUploadFile(file, document.allowedFileTypes);

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

    const storageKey = await this.cloudinaryService.uploadOnboardingDocument(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const submission = await this.employeeOnboardingRepository.createDocumentSubmission(
      record.id,
      params.documentId,
      storageKey,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENT_SUBMITTED,
      data: {
        id: submission.id,
        documentId: submission.documentId,
        documentName: submission.document.documentName,
        fileUrl: this.cloudinaryService.resolveOnboardingDocumentViewUrl(
          submission.fileUrl,
        ),
        status: this.toDocumentStatusDto(submission.status),
        rejectionNote: submission.rejectionNote,
        submittedAt: submission.submittedAt.toISOString(),
        reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      },
    };
  }

  /**
   * Submits the employee's onboarding packet for HR review.
   * Does not activate the employee — HR marks onboarding complete after approving all documents.
   */
  async completeOnboarding(user: User): Promise<CompleteOnboardingResponseDto> {
    const record = await this.requireActiveRecord(user);

    this.assertProfileComplete(record.employee);
    this.assertCustomFieldsComplete(record);
    this.assertDocumentsSubmitted(record);

    await this.notificationsService.notifyHrOnboardingSubmittedForReview(
      `${record.employee.firstName} ${record.employee.lastName}`,
      record.employee.id,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.ONBOARDING_SUBMITTED_FOR_REVIEW,
      data: {
        recordId: record.id,
        isComplete: false,
        submittedForReview: true,
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
          return !employee.address?.address?.trim();
        case "emergencyContact":
          return !employee.emergencyContact?.emergencyContactNumber?.trim();
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

  /** Ensures all required documents are submitted and none are rejected. */
  private assertDocumentsSubmitted(record: OnboardingRecordWithRelations) {
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

  private isInvitationExpired(expiresAt: Date): boolean {
    return expiresAt.getTime() < Date.now();
  }

  /** Wraps the shared status data in the standard success envelope. */
  private toStatusResponse(
    record: OnboardingRecordWithRelations,
  ): OnboardingStatusResponseDto {
    return {
      success: true,
      message: API_SUCCESS_MESSAGES.ONBOARDING_STATUS_RETRIEVED,
      data: this.toStatusData(record),
    };
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
      birthday: employee.birthday
        ? employee.birthday.toISOString().slice(0, 10)
        : null,
      address: employee.address
        ? {
            address: employee.address.address ?? null,
            city: employee.address.city ?? null,
            province: employee.address.province ?? null,
            country: employee.address.country ?? null,
          }
        : null,
      emergencyContact: employee.emergencyContact
        ? {
            emergencyContactName: employee.emergencyContact.emergencyContactName ?? null,
            emergencyContactNumber:
              employee.emergencyContact.emergencyContactNumber ?? null,
          }
        : null,
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
              fileUrl: this.cloudinaryService.resolveOnboardingDocumentViewUrl(
                latestSubmission.fileUrl,
              ),
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
