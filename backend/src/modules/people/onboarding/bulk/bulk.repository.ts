
import { prisma } from "../../../../core/database/prisma.service";

export class BulkOnboardingRepository {
  async findExistingEmails(emails: string[]): Promise<Set<string>> {
    const [users, employees] = await Promise.all([
      prisma.user.findMany({
        where: { email: { in: emails } },
        select: { email: true },
      }),
      prisma.employee.findMany({
        where: { companyEmail: { in: emails } },
        select: { companyEmail: true },
      }),
    ]);

    return new Set([
      ...users.map((user) => user.email.toLowerCase()),
      ...employees.map((employee) => employee.companyEmail.toLowerCase()),
    ]);
  }

  async findSupervisorIds(supervisorIds: string[]): Promise<Set<string>> {
    const supervisors = await prisma.employee.findMany({
      where: { id: { in: supervisorIds } },
      select: { id: true },
    });

    return new Set(supervisors.map((supervisor) => supervisor.id));
  }

  async findEmergencyContactNumbers(): Promise<string[]> {
    const contacts = await prisma.employeeEmergencyContact.findMany({
      select: { emergencyContactNumber: true },
    });

    return contacts
      .map((contact) => contact.emergencyContactNumber)
      .filter((phone): phone is string => Boolean(phone));
  }
}
