// Pure, cycle-safe org-graph walks. Deliberately DB-agnostic: the caller supplies the
// edge lookups, so this logic is unit-testable without Prisma and reusable by both
// modules (Performance audiences + evaluation visibility) per the shared contract.

/**
 * Everyone strictly BELOW `rootId` (direct reports + all descendants), breadth-first.
 * Cycle-safe: a visited set guarantees termination and de-duplication even if the
 * graph is corrupt. The root itself is never included.
 *
 * @param getChildren batched lookup: given a frontier of parent ids, return their child ids.
 */
export async function walkDownward(
  rootId: string,
  getChildren: (parentIds: string[]) => Promise<string[]>,
): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await getChildren(frontier);
    const next: string[] = [];
    for (const id of children) {
      if (id === rootId || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      next.push(id);
    }
    frontier = next;
  }
  return out;
}

/**
 * The supervisor chain ABOVE `startId`, from its direct supervisor up to the root.
 * Cycle-safe. The start node itself is never included.
 *
 * @param getParent lookup: given an employee id, return its supervisor id (or null at root).
 */
export async function walkUpward(
  startId: string,
  getParent: (id: string) => Promise<string | null>,
): Promise<string[]> {
  const seen = new Set<string>([startId]);
  const out: string[] = [];
  let cursor = await getParent(startId);
  while (cursor !== null && !seen.has(cursor)) {
    seen.add(cursor);
    out.push(cursor);
    cursor = await getParent(cursor);
  }
  return out;
}
