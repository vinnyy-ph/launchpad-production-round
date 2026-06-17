import { prisma } from "../../../core/database/prisma.service";
import type { OnboardEmployeeRequestDto } from "./dto";
import { INVITATION_EXPIRY_DAYS } from "./onboarding.constants";

/**
 * Handles onboarding persistence queries.
 * All Prisma-specific logic stays here -- controllers and services never touch Prisma directly.
 */
export class OnboardingRepository {
  /**
   * Returns true when a User account with this email already exists.
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return Boolean(user);
  }

  /**
   * Finds a supervisor employee record by ID.
   * Returns null when the supervisor does not exist.
   */
  async findSupervisor(supervisorId: string) {
    return prisma.employee.findFirst({
      where: { id: supervisorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  /**
   * Creates a User, Employee, OnboardingRecord, and OnboardingInvitation in one atomic transaction.
   * Also finds-or-creates the default OnboardingTemplate and the Department by name.
   */
  async createOnboarding(dto: OnboardEmployeeRequestDto) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.companyEmail,
          role: "EMPLOYEE",
          isActive: true,
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          companyEmail: dto.companyEmail,
          firstName: dto.companyEmail.split("@")[0],
          lastName: "",
          jobTitle: dto.jobTitle,
          supervisor: { connect: { id: dto.supervisorId } },
          department: {
            connectOrCreate: {
              where: { name: dto.department },
              create: { name: dto.department },
            },
          },
        },
        include: {
          department: { select: { name: true } },
          supervisor: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const template = await tx.onboardingTemplate.upsert({
        where: { id: await this.findDefaultTemplateId(tx) },
        update: {},
        create: { name: "Default", isDefault: true },
      });

      const record = await tx.onboardingRecord.create({
        data: {
          employeeId: employee.id,
          templateId: template.id,
        },
      });

      const invitation = await tx.onboardingInvitation.create({
        data: {
          recordId: record.id,
          sentToEmail: dto.companyEmail,
          expiresAt,
        },
      });

      return { user, employee, record, invitation };
    });
  }

  /**
   * Finds the ID of the default onboarding template, or returns a non-existent UUID
   * so the upsert falls through to the create branch.
   */
  private async findDefaultTemplateId(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
    const existing = await tx.onboardingTemplate.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });

    return existing?.id ?? "00000000-0000-0000-0000-000000000000";
  }
}
