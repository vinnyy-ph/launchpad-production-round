import type { User } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import { NotificationsService } from "../../../notifications/notifications.service";
import { ClearanceRepository } from "./clearance.repository";
import type { ClearanceRequestWithContext } from "./clearance.types";
import type {
  AssignedClearancesResponseDto,
  ClearanceActionDataDto,
  ClearanceActionResponseDto,
  ClearanceTemplatesResponseDto,
} from "./dto";

/**
 * Business logic for the clearance signing loop: the signatory's assigned queue,
 * sign / reject (with note) / reset, and server-enforced offboarding completion
 * (all requests SIGNED → record COMPLETED + employee INACTIVE).
 */
export class ClearanceService {
  constructor(
    private readonly clearanceRepository = new ClearanceRepository(),
    private readonly notificationsService = new NotificationsService(),
  ) {}

  /** Returns clearance templates HR can choose when initiating offboarding. */
  async listTemplates(): Promise<ClearanceTemplatesResponseDto> {
    const templates = await this.clearanceRepository.listTemplates();

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_TEMPLATES_RETRIEVED,
      data: templates.map((template) => ({
        id: template.id,
        name: template.name,
        isDefault: template.isDefault,
        signatoryCount: template._count.signatories,
      })),
    };
  }

  /**
   * Returns the signature requests assigned to the caller (signatoryId === caller),
   * with offboardee and record context. Drives the clearance page and pending banner.
   */
  async getAssignedClearances(
    user: User,
  ): Promise<AssignedClearancesResponseDto> {
    const caller = await this.resolveCaller(user);

    const requests = await this.clearanceRepository.findAssignedBySignatoryId(
      caller.id,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_REQUESTS_RETRIEVED,
      data: requests.map((request) => ({
        requestId: request.id,
        offboardingId: request.offboardingId,
        purpose: request.purpose,
        requirements: request.requirements,
        status: request.status,
        note: request.note,
        actionAt: request.actionAt?.toISOString() ?? null,
        offboardee: {
          id: request.offboarding.employee.id,
          firstName: request.offboarding.employee.firstName,
          lastName: request.offboarding.employee.lastName,
          jobTitle: request.offboarding.employee.jobTitle,
          department: request.offboarding.employee.department?.name ?? null,
          avatarUrl: request.offboarding.employee.user?.avatarUrl ?? null,
        },
        effectiveDate: request.offboarding.effectiveDate.toISOString(),
        recordStatus: request.offboarding.status,
      })),
    };
  }

  /**
   * Signs a clearance request. The caller must be the request's signatory.
   * After signing, if ALL requests on the record are SIGNED the offboarding is
   * completed and the employee is set INACTIVE.
   */
  async signClearance(
    user: User,
    requestId: string,
    note: string | undefined,
  ): Promise<ClearanceActionResponseDto> {
    const { request } = await this.loadAndAuthorizeSignatory(user, requestId);

    if (request.status !== "PENDING") {
      throw new Error("Signature request not pending");
    }

    const updated = await this.clearanceRepository.updateRequestStatus(
      requestId,
      "SIGNED",
      note ?? null,
      new Date(),
    );

    const completion = await this.maybeCompleteOffboarding(
      updated.offboarding.id,
      updated.offboarding.employeeId,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_SIGNED,
      data: this.toActionDto(updated, completion),
    };
  }

  /**
   * Rejects a clearance request with a required note. The caller must be the
   * request's signatory. Notifies HR so they can reset and re-open it.
   */
  async rejectClearance(
    user: User,
    requestId: string,
    note: string,
  ): Promise<ClearanceActionResponseDto> {
    const { request } = await this.loadAndAuthorizeSignatory(user, requestId);

    if (request.status !== "PENDING") {
      throw new Error("Signature request not pending");
    }

    const updated = await this.clearanceRepository.updateRequestStatus(
      requestId,
      "REJECTED",
      note,
      new Date(),
    );

    const employeeName = `${updated.offboarding.employee.firstName} ${updated.offboarding.employee.lastName}`;

    await this.notificationsService.notifyHrClearanceRejected(
      employeeName,
      updated.id,
      updated.offboarding.id,
      note,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_REJECTED,
      data: this.toActionDto(updated, {
        offboardingCompleted: false,
        employeeInactivated: false,
      }),
    };
  }

  /**
   * Re-opens a signed/rejected request to PENDING. Authorized for ADMIN/HR or the
   * request's own signatory.
   */
  async resetClearance(
    user: User,
    requestId: string,
  ): Promise<ClearanceActionResponseDto> {
    const request = await this.clearanceRepository.findRequestById(requestId);

    if (!request) {
      throw new Error("Signature request not found");
    }

    if (user.role !== "ADMIN" && user.role !== "HR") {
      const caller = await this.resolveCaller(user);

      if (request.signatoryId !== caller.id) {
        throw new Error("Not clearance signatory");
      }
    }

    const updated = await this.clearanceRepository.updateRequestStatus(
      requestId,
      "PENDING",
      null,
      null,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_RESET,
      data: this.toActionDto(updated, {
        offboardingCompleted: false,
        employeeInactivated: false,
      }),
    };
  }

  /**
   * Replaces the signatory on an in-progress clearance item (e.g. the original
   * signatory left). Keeps the snapshotted purpose/requirements, resets the item to
   * PENDING, and notifies the new signatory. ADMIN/HR only (enforced at the route).
   */
  async replaceSignatory(
    requestId: string,
    newSignatoryId: string,
  ): Promise<ClearanceActionResponseDto> {
    const request = await this.clearanceRepository.findRequestById(requestId);

    if (!request) {
      throw new Error("Signature request not found");
    }

    if (request.offboarding.status !== "IN_PROGRESS") {
      throw new Error("Offboarding not in progress");
    }

    const newSignatory = await this.clearanceRepository.findEmployeeById(
      newSignatoryId,
    );

    if (!newSignatory) {
      throw new Error("Signatory not found");
    }

    const alreadyAssigned =
      await this.clearanceRepository.signatoryHasRequestOnOffboarding(
        request.offboardingId,
        newSignatoryId,
        requestId,
      );

    if (alreadyAssigned) {
      throw new Error("Signatory already on clearance");
    }

    const updated = await this.clearanceRepository.replaceSignatory(
      requestId,
      newSignatoryId,
    );

    const employeeName = `${updated.offboarding.employee.firstName} ${updated.offboarding.employee.lastName}`;

    await this.notificationsService.notifyClearanceSignRequest(
      newSignatoryId,
      employeeName,
      updated.id,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.CLEARANCE_SIGNATORY_REPLACED,
      data: this.toActionDto(updated, {
        offboardingCompleted: false,
        employeeInactivated: false,
      }),
    };
  }

  /**
   * Completes the offboarding when no signature requests remain unsigned.
   * Server-enforced: marks the record COMPLETED and the employee INACTIVE.
   */
  private async maybeCompleteOffboarding(
    offboardingId: string,
    employeeId: string,
  ): Promise<{ offboardingCompleted: boolean; employeeInactivated: boolean }> {
    const unsigned = await this.clearanceRepository.countUnsignedRequests(
      offboardingId,
    );

    if (unsigned > 0) {
      return { offboardingCompleted: false, employeeInactivated: false };
    }

    await this.clearanceRepository.completeOffboarding(offboardingId, employeeId);

    return { offboardingCompleted: true, employeeInactivated: true };
  }

  /** Resolves the caller's employee profile or throws. */
  private async resolveCaller(user: User) {
    const caller = await this.clearanceRepository.findEmployeeByUserId(user.id);

    if (!caller) {
      throw new Error("Employee profile not found");
    }

    return caller;
  }

  /** Loads a request and asserts the caller is its signatory. */
  private async loadAndAuthorizeSignatory(user: User, requestId: string) {
    const request = await this.clearanceRepository.findRequestById(requestId);

    if (!request) {
      throw new Error("Signature request not found");
    }

    const caller = await this.resolveCaller(user);

    if (request.signatoryId !== caller.id) {
      throw new Error("Not clearance signatory");
    }

    return { request, caller };
  }

  /** Maps an updated request + completion flags to the action DTO. */
  private toActionDto(
    request: ClearanceRequestWithContext,
    completion: { offboardingCompleted: boolean; employeeInactivated: boolean },
  ): ClearanceActionDataDto {
    return {
      requestId: request.id,
      offboardingId: request.offboardingId,
      status: request.status,
      note: request.note,
      actionAt: request.actionAt?.toISOString() ?? null,
      offboardingCompleted: completion.offboardingCompleted,
      employeeInactivated: completion.employeeInactivated,
    };
  }
}
