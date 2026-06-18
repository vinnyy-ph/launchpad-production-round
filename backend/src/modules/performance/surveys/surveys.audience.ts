import type { AudienceType } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import type { AudienceDb, AudienceSpec } from "./rules/audience";

/** Maps a survey's audienceType + configs to the resolver's AudienceSpec. */
export function toAudienceSpec(
  audienceType: AudienceType,
  audienceConfigs: { supervisorId?: string; teamId?: string }[],
): AudienceSpec {
  if (audienceType === "SUPERVISOR_BASED") {
    const supervisorIds = audienceConfigs
      .map((c) => c.supervisorId)
      .filter((id): id is string => !!id);
    return { type: "SUPERVISOR_BASED", supervisorIds };
  }
  if (audienceType === "SPECIFIC_TEAMS") {
    const teamIds = audienceConfigs
      .map((c) => c.teamId)
      .filter((id): id is string => !!id);
    return { type: "SPECIFIC_TEAMS", teamIds };
  }
  return { type: "EVERYONE" };
}

/**
 * Prisma-backed AudienceDb adapter. Applies the ACTIVE-employee predicate server-side, so
 * activation, the preview endpoint, and the lazy occurrence scheduler all resolve the
 * audience identically (single source of truth — preview == reality == each recurrence).
 */
export function buildAudienceDb(): AudienceDb {
  return {
    async activeEmployeeIds(): Promise<string[]> {
      const employees = await prisma.employee.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      return employees.map((e) => e.id);
    },
    async activeAmong(ids: string[]): Promise<string[]> {
      const employees = await prisma.employee.findMany({
        where: { id: { in: ids }, status: "ACTIVE" },
        select: { id: true },
      });
      return employees.map((e) => e.id);
    },
    async childrenOf(parentIds: string[]): Promise<string[]> {
      const employees = await prisma.employee.findMany({
        where: { supervisorId: { in: parentIds } },
        select: { id: true },
      });
      return employees.map((e) => e.id);
    },
    async activeTeamMemberIds(teamIds: string[]): Promise<string[]> {
      const members = await prisma.teamMember.findMany({
        where: { teamId: { in: teamIds }, employee: { status: "ACTIVE" } },
        select: { employeeId: true },
      });
      return members.map((m) => m.employeeId);
    },
  };
}
