import type { User } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import { downwardChain } from "../../../shared/org";
import type {
  SupervisorOnboardingEmployeeDto,
  SupervisorOnboardingStatusQueryDto,
  SupervisorOnboardingStatusResponseDto,
} from "./dto";
import {
  SupervisorOnboardingRepository,
  toInvitationStatusDto,
  type SupervisorOnboardingRecord,
} from "./supervisor-onboarding.repository";

/**
 * Business logic for supervisor onboarding visibility.
 */
export class SupervisorOnboardingService {
  constructor(
    private readonly supervisorOnboardingRepository = new SupervisorOnboardingRepository(),
  ) {}

  /**
   * Returns onboarding status for all employees in the supervisor's reporting hierarchy.
   */
  async getOnboardingStatuses(
    user: User,
    query: SupervisorOnboardingStatusQueryDto,
  ): Promise<SupervisorOnboardingStatusResponseDto> {
    const supervisor = await this.supervisorOnboardingRepository.findEmployeeByUserId(
      user.id,
    );

    if (!supervisor) {
      throw new Error("Employee profile not found");
    }

    const subordinateIds = await downwardChain(supervisor.id);
    const skip = (query.page - 1) * query.limit;

    const records =
      await this.supervisorOnboardingRepository.findOnboardingStatusesByEmployeeIds(
        subordinateIds,
        {
          skip,
          take: query.limit,
          status: query.status,
        },
      );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.SUPERVISOR_ONBOARDING_STATUSES_RETRIEVED,
      data: records.map((record) => this.toEmployeeDto(record)),
    };
  }

  /** Maps a persisted onboarding record into the supervisor-facing response shape. */
  private toEmployeeDto(
    record: SupervisorOnboardingRecord,
  ): SupervisorOnboardingEmployeeDto {
    const latestInvitation = record.invitations[0];
    const requiredDocuments = record.template.documents;
    const requiredCustomFields = record.template.customFields;

    const documentsSubmitted = requiredDocuments.filter((document) =>
      record.documentSubmissions.some(
        (submission) =>
          submission.documentId === document.id &&
          submission.status !== "REJECTED",
      ),
    ).length;

    const customFieldsFilled = requiredCustomFields.filter((field) => {
      const value = record.customFieldValues.find(
        (entry) => entry.fieldId === field.id,
      );

      return Boolean(value?.value.trim());
    }).length;

    return {
      employeeId: record.employee.id,
      firstName: record.employee.firstName,
      lastName: record.employee.lastName,
      jobTitle: record.employee.jobTitle,
      department: record.employee.department?.name ?? null,
      status: record.isComplete ? "completed" : "onboarding",
      onboarding: {
        recordId: record.id,
        isComplete: record.isComplete,
        completedAt: record.completedAt?.toISOString() ?? null,
        invitationStatus: latestInvitation
          ? toInvitationStatusDto(latestInvitation.status)
          : null,
        documentsSubmitted,
        documentsRequired: requiredDocuments.length,
        customFieldsFilled,
        customFieldsRequired: requiredCustomFields.length,
      },
    };
  }
}
