import { resolveAudience, type AudienceDb } from "./audience";

function fakeDb(opts: {
  active: string[];
  children: Record<string, string[]>;
  teamMembers?: Record<string, string[]>;
}): AudienceDb {
  const activeSet = new Set(opts.active);
  return {
    activeEmployeeIds: async () => [...opts.active],
    activeAmong: async (ids) => ids.filter((id) => activeSet.has(id)),
    childrenOf: async (parentIds) => parentIds.flatMap((p) => opts.children[p] ?? []),
    activeTeamMemberIds: async (teamIds) =>
      [...new Set(teamIds.flatMap((t) => opts.teamMembers?.[t] ?? []))].filter((id) => activeSet.has(id)),
  };
}

describe("resolveAudience", () => {
  it("EVERYONE returns all active employees", async () => {
    const db = fakeDb({ active: ["a", "b", "c"], children: {} });
    expect((await resolveAudience({ type: "EVERYONE" }, db)).sort()).toEqual(["a", "b", "c"]);
  });

  it("SUPERVISOR_BASED includes the anchor plus the full downward chain", async () => {
    const db = fakeDb({ active: ["vp", "m1", "e1", "e2"], children: { vp: ["m1"], m1: ["e1", "e2"] } });
    const ids = await resolveAudience({ type: "SUPERVISOR_BASED", supervisorIds: ["vp"] }, db);
    expect(ids.sort()).toEqual(["e1", "e2", "m1", "vp"]);
  });

  it("SUPERVISOR_BASED excludes inactive/deactivated employees", async () => {
    const db = fakeDb({ active: ["vp", "e1"], children: { vp: ["e1", "e2"] } });
    const ids = await resolveAudience({ type: "SUPERVISOR_BASED", supervisorIds: ["vp"] }, db);
    expect(ids.sort()).toEqual(["e1", "vp"]);
    expect(ids).not.toContain("e2");
  });

  it("SUPERVISOR_BASED dedupes overlapping anchors", async () => {
    const db = fakeDb({ active: ["vp", "m1", "e1"], children: { vp: ["m1"], m1: ["e1"] } });
    const ids = await resolveAudience({ type: "SUPERVISOR_BASED", supervisorIds: ["vp", "m1"] }, db);
    expect(ids.sort()).toEqual(["e1", "m1", "vp"]);
  });

  it("SPECIFIC_TEAMS returns active members of the listed teams", async () => {
    const db = fakeDb({ active: ["a", "b"], children: {}, teamMembers: { t1: ["a", "b"], t2: ["x"] } });
    expect((await resolveAudience({ type: "SPECIFIC_TEAMS", teamIds: ["t1"] }, db)).sort()).toEqual(["a", "b"]);
  });
});
