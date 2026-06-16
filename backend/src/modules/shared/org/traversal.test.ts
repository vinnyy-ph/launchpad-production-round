import { walkDownward, walkUpward } from "./traversal";

// Build a batched children-lookup from a {parent: [children]} adjacency map.
function childrenFrom(adj: Record<string, string[]>) {
  return async (parentIds: string[]): Promise<string[]> =>
    parentIds.flatMap((id) => adj[id] ?? []);
}

// Build a parent-lookup from a {child: supervisor} map (null = root).
function parentFrom(parents: Record<string, string | null>) {
  return async (id: string): Promise<string | null> => parents[id] ?? null;
}

describe("walkDownward", () => {
  it("returns all descendants of a multi-level tree, excluding the root", async () => {
    const adj = { ceo: ["vp1", "vp2"], vp1: ["e1", "e2"], vp2: ["e3"] };
    const result = await walkDownward("ceo", childrenFrom(adj));
    expect(result.sort()).toEqual(["e1", "e2", "e3", "vp1", "vp2"]);
    expect(result).not.toContain("ceo");
  });

  it("returns an empty list for a leaf with no reports", async () => {
    const result = await walkDownward("leaf", childrenFrom({}));
    expect(result).toEqual([]);
  });

  it("terminates and dedupes when the graph contains a cycle", async () => {
    // a -> b -> c -> a (corrupt data): must not loop forever, root stays excluded.
    const result = await walkDownward("a", childrenFrom({ a: ["b"], b: ["c"], c: ["a"] }));
    expect(result.sort()).toEqual(["b", "c"]);
  });

  it("visits a node reachable by two paths only once", async () => {
    // diamond: a -> b, a -> c, b -> d, c -> d
    const result = await walkDownward("a", childrenFrom({ a: ["b", "c"], b: ["d"], c: ["d"] }));
    expect(result.sort()).toEqual(["b", "c", "d"]);
    expect(result.filter((x) => x === "d")).toHaveLength(1);
  });
});

describe("walkUpward", () => {
  it("returns the supervisor chain up to the root, in order, excluding the start", async () => {
    const result = await walkUpward("e1", parentFrom({ e1: "vp1", vp1: "ceo", ceo: null }));
    expect(result).toEqual(["vp1", "ceo"]);
  });

  it("returns an empty list for the root node", async () => {
    const result = await walkUpward("ceo", parentFrom({ ceo: null }));
    expect(result).toEqual([]);
  });

  it("terminates when parent pointers form a cycle", async () => {
    // a -> b -> c -> a: stops on revisiting a.
    const result = await walkUpward("a", parentFrom({ a: "b", b: "c", c: "a" }));
    expect(result).toEqual(["b", "c"]);
  });
});
