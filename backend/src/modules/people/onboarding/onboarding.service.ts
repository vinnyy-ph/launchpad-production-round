import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import type {
  HrCompleteOnboardingResponseDto,
  OnboardEmployeeRequestDto,
  OnboardEmployeeResponseDto,
} from "./dto";
import { REQUIRED_PROFILE_FIELDS } from "./onboarding.constants";
import { OnboardingRepository } from "./onboarding.repository";
import { NotificationsService } from "../../notifications/notifications.service";

type OnboardingRecordWithRelations = NonNullable<
  Awaited<ReturnType<OnboardingRepository["findRecordByEmployeeId"]>>
>;

/**
 * Orchestrates the onboard-employee workflow: validates business rules,
 * delegates persistence to the repository, and maps results into DTOs.
 */
export class OnboardingService {
  constructor(
    private readonly onboardingRepository = new OnboardingRepository(),
    private readonly notificationsService = new NotificationsService(),
  ) {}

  /**
   * Onboards a new employee by creating a User, Employee, OnboardingRecord, and Invitation.
   * Throws when the email is taken or the supervisor does not exist.
   */
  async onboardEmployee(dto: OnboardEmployeeRequestDto): Promise<OnboardEmployeeResponseDto> {
    const emailTaken = await this.onboardingRepository.emailExists(dto.companyEmail);

    if (emailTaken) {
      throw new Error("Employee already exists");
    }

    const supervisor = await this.onboardingRepository.findSupervisor(dto.supervisorId);

    if (!supervisor) {
      throw new Error("Supervisor not found");
    }

    if (dto.emergencyContactNormalizedPhone) {
      const phoneInUse = await this.onboardingRepository.emergencyContactPhoneInUse(
        dto.emergencyContactNormalizedPhone,
      );

      if (phoneInUse) {
        throw new Error("Emergency contact phone number is already in use");
      }
    }

    const result = await this.onboardingRepository.createOnboarding(dto);

    const employeeName = `${result.employee.firstName} ${result.employee.lastName}`;

    await this.notificationsService.notifySupervisorOnboardingStarted(
      employeeName,
      result.employee.id,
      dto.supervisorId,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.EMPLOYEE_ONBOARDED,
      data: {
        employee: {
          id: result.employee.id,
          companyEmail: result.employee.companyEmail,
          firstName: result.employee.firstName,
          lastName: result.employee.lastName,
          middleName: result.employee.middleName,
          personalEmail: result.employee.personalEmail,
          birthday: result.employee.birthday
            ? result.employee.birthday.toISOString().slice(0, 10)
            : null,
          address: result.employee.address
            ? {
                address: result.employee.address.address ?? null,
                city: result.employee.address.city ?? null,
                province: result.employee.address.province ?? null,
                country: result.employee.address.country ?? null,
              }
            : null,
          emergencyContact: result.employee.emergencyContact
            ? {
                emergencyContactName:
                  result.employee.emergencyContact.emergencyContactName ?? null,
                emergencyContactNumber:
                  result.employee.emergencyContact.emergencyContactNumber ?? null,
              }
            : null,
          jobTitle: result.employee.jobTitle ?? "",
          department: result.employee.department?.name ?? "",
          supervisor: {
            id: result.employee.supervisor!.id,
            firstName: result.employee.supervisor!.firstName,
            lastName: result.employee.supervisor!.lastName,
          },
          status: result.employee.status.toLowerCase(),
        },
        onboardingRecord: {
          id: result.record.id,
          isComplete: result.record.isComplete,
          createdAt: result.record.createdAt,
        },
        invitation: {
          id: result.invitation.id,
          sentToEmail: result.invitation.sentToEmail,
          status: result.invitation.status.toLowerCase(),
          sentAt: result.invitation.sentAt,
          expiresAt: result.invitation.expiresAt,
        },
      },
    };
  }

  /**
   * Marks an employee's onboarding complete when all requirements are satisfied.
   * Requires all required documents to be approved (not just submitted).
   */
  async completeOnboarding(employeeId: string): Promise<HrCompleteOnboardingResponseDto> {
    const record = await this.onboardingRepository.findRecordByEmployeeId(employeeId);

    if (!record) {
      throw new Error("Onboarding record not found");
    }

    if (record.isComplete) {
      throw new Error("Onboarding already complete");
    }

    this.assertProfileComplete(record.employee);
    this.assertCustomFieldsComplete(record);
    this.assertDocumentsApproved(record);

    const completedAt = new Date();

    await this.onboardingRepository.completeOnboarding(
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
      message: API_SUCCESS_MESSAGES.HR_ONBOARDING_COMPLETED,
      data: {
        recordId: record.id,
        isComplete: true,
        completedAt: completedAt.toISOString(),
        employeeStatus: "active",
      },
    };
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
      throw new Error("Onboarding not ready");
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
      throw new Error("Onboarding not ready");
    }
  }

  /** Ensures all required documents have an approved submission. */
  private assertDocumentsApproved(record: OnboardingRecordWithRelations) {
    const requiredDocuments = record.template.documents.filter(
      (document) => document.isRequired,
    );

    const missingDocument = requiredDocuments.find((document) => {
      const latestSubmission = record.documentSubmissions.find(
        (submission) => submission.documentId === document.id,
      );

      return !latestSubmission || latestSubmission.status !== "APPROVED";
    });

    if (missingDocument) {
      throw new Error("Onboarding not ready");
    }
  }
}
