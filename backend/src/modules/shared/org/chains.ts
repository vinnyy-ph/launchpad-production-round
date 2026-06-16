import { walkDownward, walkUpward } from "./traversal";

/**
 * The minimal slice of a Prisma-like client the org traversals need. Declaring it
 * structurally (instead of importing the generated `PrismaClient`) keeps these functions
 * unit-testable with an in-memory fake and decoupled from the generated client.
 */
export interface OrgGraphDb {
  employee: {
    findMany(args: {
      where: { supervisorId: { in: string[] } };
      select: { id: true };
    }): Promise<Array<{ id: string }>>;
    findUnique(args: {
      where: { id: string };
      select: { supervisorId: true };
    }): Promise<{ supervisorId: string | null } | null>;
  };
}

/**
 * Build the Prisma-bound org traversals over a given client. The thin lookups here are
 * the only DB-aware code; the BFS/cycle-safety lives in the pure walkers.
 */
export function createOrgChains(db: OrgGraphDb) {
  const getChildren = async (parentIds: string[]): Promise<string[]> => {
    const rows = await db.employee.findMany({
      where: { supervisorId: { in: parentIds } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  };

  const getParent = async (id: string): Promise<string | null> => {
    const row = await db.employee.findUnique({
      where: { id },
      select: { supervisorId: true },
    });
    return row?.supervisorId ?? null;
  };

  return {
    /** Everyone strictly below `supervisorId` (direct reports + all descendants), cycle-safe. */
    downwardChain: (supervisorId: string) => walkDownward(supervisorId, getChildren),
    /** The supervisor chain above `employeeId` up to the root, cycle-safe. */
    upwardChain: (employeeId: string) => walkUpward(employeeId, getParent),
  };
}
