import { tryExtractNormalizedPhilippinePhone } from "../../shared/phone";
import { prisma } from "../../../core/database/prisma.service";
import type { OnboardEmployeeRequestDto } from "./dto";
import { INVITATION_EXPIRY_HOURS } from "./onboarding.constants";

/**
 * Handles onboarding persistence queries.
 * All Prisma-specific logic stays here -- controllers and services never touch Prisma directly.
 */
export class OnboardingRepository {
  /**
   * Returns true when a User account with this email already exists.
   */
  async emailExists(email: string): Promise<boolean> {
    const [user, employee] = await Promise.all([
      prisma.user.findUnique({
        where: { email },
        select: { id: true },
      }),
      prisma.employee.findUnique({
        where: { companyEmail: email },
        select: { id: true },
      }),
    ]);

    return Boolean(user || employee);
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
   * Returns true when another employee already uses the same emergency contact phone number.
   */
  async emergencyContactPhoneInUse(normalizedPhone: string): Promise<boolean> {
    const contacts = await prisma.employeeEmergencyContact.findMany({
      select: { emergencyContactNumber: true },
    });

    return contacts.some((contact) => {
      const existingPhone = tryExtractNormalizedPhilippinePhone(
        contact.emergencyContactNumber ?? "",
      );

      return existingPhone === normalizedPhone;
    });
  }

  /** True when the HR pre-fill includes any address field. */
  private hasAddress(dto: OnboardEmployeeRequestDto): boolean {
    return (
      dto.address !== undefined ||
      dto.city !== undefined ||
      dto.province !== undefined ||
      dto.country !== undefined
    );
  }

  /** True when the HR pre-fill includes an emergency contact name or number. */
  private hasEmergencyContact(dto: OnboardEmployeeRequestDto): boolean {
    return dto.emergencyContactName !== undefined || dto.emergencyContact !== undefined;
  }

  /**
   * Creates a User, Employee, OnboardingRecord, and OnboardingInvitation in one atomic transaction.
   * Also finds-or-creates the default OnboardingTemplate and the Department by name.
   */
  async createOnboarding(dto: OnboardEmployeeRequestDto) {
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    // Neon + PrismaPg can be slow on cold connections; default 5s interactive tx timeout is too tight.
    return prisma.$transaction(
      async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.companyEmail,
          role: "EMPLOYEE",
          isActive: true,
        },
      });

      const employee = await tx.employee.create({
        data: {
          user: { connect: { id: user.id } },
          companyEmail: dto.companyEmail,
          firstName: dto.firstName ?? dto.companyEmail.split("@")[0],
          lastName: dto.lastName ?? "",
          middleName: dto.middleName ?? null,
          personalEmail: dto.personalEmail ?? null,
          birthday: dto.birthday ? new Date(dto.birthday) : null,
          address: this.hasAddress(dto)
            ? {
                create: {
                  address: dto.address ?? null,
                  city: dto.city ?? null,
                  province: dto.province ?? null,
                  country: dto.country ?? null,
                },
              }
            : undefined,
          emergencyContact: this.hasEmergencyContact(dto)
            ? {
                create: {
                  emergencyContactName: dto.emergencyContactName ?? null,
                  emergencyContactNumber: dto.emergencyContact ?? null,
                },
              }
            : undefined,
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
          address: {
            select: { address: true, city: true, province: true, country: true },
          },
          emergencyContact: {
            select: { emergencyContactName: true, emergencyContactNumber: true },
          },
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
      },
      { maxWait: 15_000, timeout: 60_000 },
    );
  }

  /**
   * Loads the onboarding record for an employee, including template checklist data.
   */
  async findRecordByEmployeeId(employeeId: string) {
    return prisma.onboardingRecord.findFirst({
      where: { employeeId },
      include: {
        employee: {
          include: {
            department: { select: { name: true } },
            address: {
              select: { address: true, city: true, province: true, country: true },
            },
            emergencyContact: {
              select: { emergencyContactName: true, emergencyContactNumber: true },
            },
          },
        },
        template: {
          include: {
            documents: { orderBy: { createdAt: "asc" } },
            customFields: { orderBy: { createdAt: "asc" } },
          },
        },
        documentSubmissions: { orderBy: { submittedAt: "desc" } },
        customFieldValues: true,
      },
    });
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
