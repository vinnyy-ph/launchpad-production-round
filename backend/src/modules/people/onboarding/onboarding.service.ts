import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import type {
  OnboardEmployeeRequestDto,
  OnboardEmployeeResponseDto,
} from "./dto";
import { OnboardingRepository } from "./onboarding.repository";

/**
 * Orchestrates the onboard-employee workflow: validates business rules,
 * delegates persistence to the repository, and maps results into DTOs.
 */
export class OnboardingService {
  constructor(
    private readonly onboardingRepository = new OnboardingRepository(),
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
          birthday: result.employee.birthday?.toISOString() ?? null,
          address: result.employee.address,
          emergencyContact: result.employee.emergencyContact,
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
}
