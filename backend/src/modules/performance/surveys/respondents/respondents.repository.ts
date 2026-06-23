import { prisma } from "../../../../core/database/prisma.service";
import type { RosterMember } from "./respondents.types";

function fullName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

export class RespondentsRepository {
  /** Audience snapshot for an occurrence, each member tagged with whether they responded,
   *  sorted by name. */
  async findRoster(occurrenceId: string): Promise<RosterMember[]> {
    const [members, completions] = await Promise.all([
      prisma.surveyAudienceMember.findMany({
        where: { occurrenceId },
        select: {
          employeeId: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.surveyCompletion.findMany({
        where: { occurrenceId },
        select: { employeeId: true },
      }),
    ]);

    const completed = new Set(completions.map((c) => c.employeeId));
    return members
      .map((m) => ({
        employeeId: m.employeeId,
        name: fullName(m.employee.firstName, m.employee.lastName),
        submitted: completed.has(m.employeeId),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Display name for a single employee (the drill-down subject), or null if not found. */
  async findEmployeeName(employeeId: string): Promise<string | null> {
    const e = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { firstName: true, lastName: true },
    });
    return e ? fullName(e.firstName, e.lastName) : null;
  }

  /** When the target submitted (named surveys only — null when there is no response row). */
  async findResponseSubmittedAt(occurrenceId: string, employeeId: string): Promise<Date | null> {
    const r = await prisma.surveyResponse.findFirst({
      where: { occurrenceId, employeeId },
      select: { submittedAt: true },
    });
    return r?.submittedAt ?? null;
  }
}
