import { prisma } from "../../../core/database/prisma.service";
import { createOrgChains, type OrgGraphDb } from "./chains";

// Adapt the real Prisma client to the minimal OrgGraphDb shape. Calling Prisma's generic
// methods with concrete args (inference) sidesteps the assignability friction of binding a
// generic method directly to a concrete signature.
const db: OrgGraphDb = {
  employee: {
    findMany: (args) => prisma.employee.findMany(args),
    findUnique: (args) => prisma.employee.findUnique(args),
  },
};

/** Prisma-bound org traversals for application code. */
export const { downwardChain, upwardChain } = createOrgChains(db);

// Pure primitives + factory re-exported for testing and advanced use.
export { walkDownward, walkUpward } from "./traversal";
export { createOrgChains } from "./chains";
export type { OrgGraphDb } from "./chains";
