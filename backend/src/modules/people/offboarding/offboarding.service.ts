import type { User } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import { CloudinaryService } from "../../../core/cloudinary";
import { downwardChain, upwardChain } from "../../shared/org";
import { NotificationsService } from "../../notifications/notifications.service";
import type {
  InitiateOffboardingRequestDto,
  MyOffboardingResponseDto,
  OffboardingDetailDto,
  OffboardingDetailResponseDto,
  OffboardingListItemDto,
  OffboardingListResponseDto,
  ReassignResponseDto,
} from "./dto";
import { OffboardingRepository } from "./offboarding.repository";
import type { OffboardingRecordWithRelations } from "./offboarding.types";

const cloudinaryService = new CloudinaryService();

/** Resolves stored attachment storage keys into short-lived signed view URLs. */
function toAttachmentDtos(
  attachments: ReadonlyArray<{ id: string; url: string; fileName: string }>,
): OffboardingDetailDto["attachments"] {
  return attachments.map((attachment) => ({
    id: attachment.id,
    url: cloudinaryService.resolveOnboardingDocumentViewUrl(attachment.url),
    fileName: attachment.fileName,
  }));
}

/** Maps a persisted offboarding record (with relations) to the detail DTO. */
export function toOffboardingDetailDto(
  record: OffboardingRecordWithRelations,
): OffboardingDetailDto {
  return {
    id: record.id,
    employee: {
      id: record.employee.id,
      firstName: record.employee.firstName,
      middleName: record.employee.middleName,
      lastName: record.employee.lastName,
      companyEmail: record.employee.companyEmail,
      jobTitle: record.employee.jobTitle,
      department: record.employee.department?.name ?? null,
      avatarUrl: record.employee.user?.avatarUrl ?? null,
    },
    initiatedBy: {
      id: record.initiatedBy.id,
      firstName: record.initiatedBy.firstName,
      lastName: record.initiatedBy.lastName,
    },
    clearanceTemplateId: record.clearanceTemplateId,
    status: record.status,
    tenderDate: record.tenderDate.toISOString(),
    effectiveDate: record.effectiveDate.toISOString(),
    attachments: toAttachmentDtos(record.attachments),
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
    signatureRequests: record.signatureRequests.map((request) => ({
      id: request.id,
      signatory: {
        id: request.signatory.id,
        firstName: request.signatory.firstName,
        lastName: request.signatory.lastName,
      },
      purpose: request.purpose,
      requirements: request.requirements,
      status: request.status,
      note: request.note,
      actionAt: request.actionAt?.toISOString() ?? null,
    })),
  };
}

/** Maps a persisted offboarding record (with relations) to the list-item DTO. */
function toOffboardingListItemDto(
  record: OffboardingRecordWithRelations,
): OffboardingListItemDto {
  const totalCount = record.signatureRequests.length;
  const signedCount = record.signatureRequests.filter(
    (request) => request.status === "SIGNED",
  ).length;

  return {
    id: record.id,
    employee: {
      id: record.employee.id,
      firstName: record.employee.firstName,
      middleName: record.employee.middleName,
      lastName: record.employee.lastName,
      companyEmail: record.employee.companyEmail,
      jobTitle: record.employee.jobTitle,
      department: record.employee.department?.name ?? null,
      avatarUrl: record.employee.user?.avatarUrl ?? null,
    },
    status: record.status,
    tenderDate: record.tenderDate.toISOString(),
    effectiveDate: record.effectiveDate.toISOString(),
    attachments: toAttachmentDtos(record.attachments),
    signedCount,
    totalCount,
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
  };
}

/**
 * Orchestrates the offboarding lifecycle: initiation with clearance snapshots,
 * scoped listing, authorized detail, the offboardee self-view, and reassignment.
 */
export class OffboardingService {
  constructor(
    private readonly offboardingRepository = new OffboardingRepository(),
    private readonly notificationsService = new NotificationsService(),
  ) {}

  /**
   * Initiates offboarding: resolves the clearance template, snapshots one
   * signature request per template signatory, sets the employee to OFFBOARDING,
   * and (optionally) reassigns the offboardee's reports and led teams.
   */
  async initiateOffboarding(
    user: User,
    dto: InitiateOffboardingRequestDto,
  ): Promise<OffboardingDetailResponseDto> {
    const initiator = await this.offboardingRepository.findEmployeeByUserId(
      user.id,
    );

    if (!initiator) {
      throw new Error("Employee profile not found");
    }

    const employee = await this.offboardingRepository.findEmployeeById(
      dto.employeeId,
    );

    if (!employee) {
      throw new Error("Employee not found");
    }

    const existing =
      await this.offboardingRepository.findActiveRecordByEmployeeId(
        dto.employeeId,
      );

    if (existing) {
      throw new Error("Offboarding already exists");
    }

    const template = await this.offboardingRepository.findTemplate(
      dto.clearanceTemplateId,
    );

    if (!template) {
      throw new Error("Clearance template not found");
    }

    const signatories =
      await this.offboardingRepository.findTemplateSignatories(template.id);

    if (signatories.length === 0) {
      throw new Error("Clearance template has no signatories");
    }

    const responsibilities =
      await this.offboardingRepository.countTransitionResponsibilities(
        dto.employeeId,
      );

    if (responsibilities.directReports > 0 && !dto.newSupervisorId) {
      throw new Error("newSupervisorId is required");
    }

    if (responsibilities.ledTeams > 0 && !dto.newTeamLeaderId) {
      throw new Error("newTeamLeaderId is required");
    }

    if (dto.newSupervisorId) {
      const target = await this.offboardingRepository.findEmployeeById(
        dto.newSupervisorId,
      );

      if (!target) {
        throw new Error("Reassignment target not found");
      }
    }

    if (dto.newTeamLeaderId) {
      const target = await this.offboardingRepository.findEmployeeById(
        dto.newTeamLeaderId,
      );

      if (!target) {
        throw new Error("Reassignment target not found");
      }
    }

    if (dto.newSupervisorId || dto.newTeamLeaderId) {
      await this.offboardingRepository.reassignReportsAndTeams(
        dto.employeeId,
        dto.newSupervisorId,
        dto.newTeamLeaderId,
      );
    }

    const created = await this.offboardingRepository.createOffboarding(
      dto,
      template.id,
      initiator.id,
      signatories,
    );

    const record = await this.offboardingRepository.findRecordById(created.id);
    const detail = toOffboardingDetailDto(record!);

    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const supervisorIds = await upwardChain(dto.employeeId);

    await this.notificationsService.notifyOffboardingStarted(
      dto.employeeId,
      created.id,
    );
    await this.notificationsService.notifySupervisorOffboardingStarted(
      supervisorIds,
      employeeName,
      created.id,
    );

    for (const request of detail.signatureRequests) {
      await this.notificationsService.notifyClearanceSignRequest(
        request.signatory.id,
        employeeName,
        request.id,
      );
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.OFFBOARDING_INITIATED,
      data: detail,
    };
  }

  /**
   * Lists offboarding records. ADMIN/HR see all; everyone else (a supervisor) sees
   * only records for employees in their downward chain.
   */
  async listOffboardings(user: User): Promise<OffboardingListResponseDto> {
    let employeeIds: string[] | undefined;

    if (user.role !== "ADMIN" && user.role !== "HR") {
      const caller = await this.offboardingRepository.findEmployeeByUserId(
        user.id,
      );

      if (!caller) {
        throw new Error("Employee profile not found");
      }

      employeeIds = await downwardChain(caller.id);
    }

    const records = await this.offboardingRepository.listRecords(employeeIds);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.OFFBOARDING_RECORDS_RETRIEVED,
      data: records.map((record) => toOffboardingListItemDto(record)),
    };
  }

  /**
   * Returns one offboarding record. Authorized for ADMIN/HR, the offboardee
   * (self), or any signatory on the record.
   */
  async getOffboardingById(
    user: User,
    id: string,
  ): Promise<OffboardingDetailResponseDto> {
    const record = await this.offboardingRepository.findRecordById(id);

    if (!record) {
      throw new Error("Offboarding record not found");
    }

    if (user.role !== "ADMIN" && user.role !== "HR") {
      const caller = await this.offboardingRepository.findEmployeeByUserId(
        user.id,
      );

      if (!caller) {
        throw new Error("Employee profile not found");
      }

      const isOffboardee = record.employee.id === caller.id;
      const isSignatory = record.signatureRequests.some(
        (request) => request.signatory.id === caller.id,
      );

      if (!isOffboardee && !isSignatory) {
        throw new Error("Forbidden");
      }
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.OFFBOARDING_RECORD_RETRIEVED,
      data: toOffboardingDetailDto(record),
    };
  }

  /** Returns the caller's own offboarding record, or null when none exists. */
  async getMyOffboarding(user: User): Promise<MyOffboardingResponseDto> {
    const caller = await this.offboardingRepository.findEmployeeByUserId(
      user.id,
    );

    if (!caller) {
      throw new Error("Employee profile not found");
    }

    const record = await this.offboardingRepository.findDetailByEmployeeId(
      caller.id,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.OFFBOARDING_RECORD_RETRIEVED,
      data: record ? toOffboardingDetailDto(record) : null,
    };
  }

  /**
   * Reassigns the offboardee's direct reports and led teams to another employee.
   * ADMIN/HR only (enforced at the route).
   */
  async reassignReports(
    id: string,
    newSupervisorId: string,
    newTeamLeaderId?: string,
  ): Promise<ReassignResponseDto> {
    const record = await this.offboardingRepository.findRecordById(id);

    if (!record) {
      throw new Error("Offboarding record not found");
    }

    const target = await this.offboardingRepository.findEmployeeById(
      newSupervisorId,
    );

    if (!target) {
      throw new Error("Reassignment target not found");
    }

    const teamLeaderId = newTeamLeaderId ?? newSupervisorId;
    const teamLeader =
      teamLeaderId === newSupervisorId
        ? target
        : await this.offboardingRepository.findEmployeeById(teamLeaderId);

    if (!teamLeader) {
      throw new Error("Reassignment target not found");
    }

    const result = await this.offboardingRepository.reassignReportsAndTeams(
      record.employee.id,
      newSupervisorId,
      teamLeaderId,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.REPORTS_REASSIGNED,
      data: {
        offboardingId: record.id,
        reassignedReports: result.reassignedReports,
        reassignedTeams: result.reassignedTeams,
        newSupervisorId,
        newTeamLeaderId: teamLeaderId,
      },
    };
  }
}
