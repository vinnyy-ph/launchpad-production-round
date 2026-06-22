import { prisma } from "../../../core/database/prisma.service";
import type { InitiateOffboardingRequestDto } from "./dto";

/** Shape returned by detail/list queries — kept here so the service can derive types. */
const detailInclude = {
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      department: { select: { name: true } },
    },
  },
  initiatedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  signatureRequests: {
    orderBy: { createdAt: "asc" as const },
    include: {
      signatory: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const;

/**
 * Persistence layer for the offboarding lifecycle.
 * All Prisma access for offboarding lives here.
 */
export class OffboardingRepository {
  /** Loads the employee profile linked to an auth user. */
  async findEmployeeByUserId(userId: string) {
    return prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  /** Loads an employee by ID. Returns null when absent. */
  async findEmployeeById(employeeId: string) {
    return prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, status: true },
    });
  }

  /** Counts direct reports and led teams that must be reassigned before offboarding. */
  async countTransitionResponsibilities(employeeId: string) {
    const [directReports, ledTeams] = await Promise.all([
      prisma.employee.count({ where: { supervisorId: employeeId } }),
      prisma.team.count({ where: { leaderId: employeeId } }),
    ]);

    return { directReports, ledTeams };
  }

  /** Returns the in-flight offboarding record for an employee, if any. */
  async findActiveRecordByEmployeeId(employeeId: string) {
    return prisma.offboardingRecord.findUnique({
      where: { employeeId },
      select: { id: true },
    });
  }

  /** Resolves the clearance template by ID, or the default template when no ID is given. */
  async findTemplate(templateId?: string) {
    if (templateId) {
      return prisma.clearanceTemplate.findUnique({
        where: { id: templateId },
        select: { id: true },
      });
    }

    return prisma.clearanceTemplate.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });
  }

  /** Loads the ordered signatories configured on a clearance template. */
  async findTemplateSignatories(templateId: string) {
    return prisma.clearanceSignatory.findMany({
      where: { templateId },
      orderBy: { order: "asc" },
      select: {
        employeeId: true,
        purpose: true,
        requirements: true,
        order: true,
      },
    });
  }

  /**
   * Initiates offboarding atomically: creates the record, snapshots one
   * ClearanceSignatureRequest per template signatory (copying purpose/requirements),
   * and flips the employee status to OFFBOARDING.
   */
  async createOffboarding(
    dto: InitiateOffboardingRequestDto,
    templateId: string,
    initiatedById: string,
    signatories: Array<{
      employeeId: string;
      purpose: string;
      requirements: string;
    }>,
  ) {
    return prisma.$transaction(async (tx) => {
      const record = await tx.offboardingRecord.create({
        data: {
          employeeId: dto.employeeId,
          clearanceTemplateId: templateId,
          initiatedById,
          tenderDate: new Date(dto.tenderDate),
          effectiveDate: new Date(dto.effectiveDate),
          attachmentUrl: dto.attachmentUrl,
          status: "IN_PROGRESS",
        },
      });

      for (const signatory of signatories) {
        await tx.clearanceSignatureRequest.create({
          data: {
            offboardingId: record.id,
            signatoryId: signatory.employeeId,
            purpose: signatory.purpose,
            requirements: signatory.requirements,
            status: "PENDING",
          },
        });
      }

      await tx.employee.update({
        where: { id: dto.employeeId },
        data: { status: "OFFBOARDING" },
      });

      return record;
    });
  }

  /** Loads one offboarding record with employee, initiator, and signature requests. */
  async findRecordById(id: string) {
    return prisma.offboardingRecord.findUnique({
      where: { id },
      include: detailInclude,
    });
  }

  /** Loads the offboarding record for an employee with full detail. */
  async findDetailByEmployeeId(employeeId: string) {
    return prisma.offboardingRecord.findUnique({
      where: { employeeId },
      include: detailInclude,
    });
  }

  /**
   * Lists offboarding records. When `employeeIds` is provided the list is scoped
   * to those employees (supervisor view); when undefined, all records are returned
   * (ADMIN/HR view).
   */
  async listRecords(employeeIds?: string[]) {
    return prisma.offboardingRecord.findMany({
      where: employeeIds ? { employeeId: { in: employeeIds } } : undefined,
      orderBy: { createdAt: "desc" },
      include: detailInclude,
    });
  }

  /**
   * Reassigns every direct report of the offboardee to a new supervisor and
   * transfers leadership of any team the offboardee leads — atomically.
   */
  async reassignReportsAndTeams(
    offboardeeId: string,
    newSupervisorId: string | undefined,
    newTeamLeaderId: string | undefined = newSupervisorId,
  ) {
    return prisma.$transaction(async (tx) => {
      const reports = newSupervisorId
        ? await tx.employee.updateMany({
            where: { supervisorId: offboardeeId },
            data: { supervisorId: newSupervisorId },
          })
        : { count: 0 };

      const teams = newTeamLeaderId
        ? await tx.team.updateMany({
            where: { leaderId: offboardeeId },
            data: { leaderId: newTeamLeaderId },
          })
        : { count: 0 };

      return { reassignedReports: reports.count, reassignedTeams: teams.count };
    });
  }
}
