import { createOrgChains, type OrgGraphDb } from "./chains";

// In-memory org from an {employeeId: supervisorId} map (null = root).
function fakeDb(supervisorOf: Record<string, string | null>): OrgGraphDb {
  const ids = Object.keys(supervisorOf);
  return {
    employee: {
      findMany: async ({ where }) => {
        const parents = new Set(where.supervisorId.in);
        return ids
          .filter((id) => {
            const sup = supervisorOf[id];
            return sup !== null && parents.has(sup);
          })
          .map((id) => ({ id }));
      },
      findUnique: async ({ where }) => {
        if (!(where.id in supervisorOf)) return null;
        return { supervisorId: supervisorOf[where.id] };
      },
    },
  };
}

describe("createOrgChains.downwardChain (Prisma-bound)", () => {
  it("returns the full downward chain for a supervisor", async () => {
    const { downwardChain } = createOrgChains(fakeDb({ ceo: null, vp: "ceo", e1: "vp", e2: "vp" }));
    expect((await downwardChain("ceo")).sort()).toEqual(["e1", "e2", "vp"]);
    expect((await downwardChain("vp")).sort()).toEqual(["e1", "e2"]);
  });

  it("returns an empty chain for a leaf employee", async () => {
    const { downwardChain } = createOrgChains(fakeDb({ ceo: null, e1: "ceo" }));
    expect(await downwardChain("e1")).toEqual([]);
  });
});

describe("createOrgChains.upwardChain (Prisma-bound)", () => {
  it("returns the chain from an employee up to the root", async () => {
    const { upwardChain } = createOrgChains(fakeDb({ ceo: null, vp: "ceo", e1: "vp" }));
    expect(await upwardChain("e1")).toEqual(["vp", "ceo"]);
  });

  it("returns an empty chain for the root", async () => {
    const { upwardChain } = createOrgChains(fakeDb({ ceo: null }));
    expect(await upwardChain("ceo")).toEqual([]);
  });
});
