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

  it("SUPERVISOR_BASED returns the full downward subtree EXCLUDING the anchor itself", async () => {
    // Brief: "Selected supervisor(s)' direct reports (and everyone below them)" → anchor excluded,
    // intermediate manager m1 and its reports e1/e2 included (descendants, not just direct reports).
    const db = fakeDb({ active: ["vp", "m1", "e1", "e2"], children: { vp: ["m1"], m1: ["e1", "e2"] } });
    const ids = await resolveAudience({ type: "SUPERVISOR_BASED", supervisorIds: ["vp"] }, db);
    expect(ids.sort()).toEqual(["e1", "e2", "m1"]);
    expect(ids).not.toContain("vp");
  });

  it("SUPERVISOR_BASED excludes inactive/deactivated employees (and the anchor)", async () => {
    const db = fakeDb({ active: ["vp", "e1"], children: { vp: ["e1", "e2"] } });
    const ids = await resolveAudience({ type: "SUPERVISOR_BASED", supervisorIds: ["vp"] }, db);
    expect(ids.sort()).toEqual(["e1"]);
    expect(ids).not.toContain("e2"); // inactive
    expect(ids).not.toContain("vp"); // anchor
  });

  it("SUPERVISOR_BASED: an anchor with no reports contributes nobody", async () => {
    const db = fakeDb({ active: ["solo"], children: {} });
    const ids = await resolveAudience({ type: "SUPERVISOR_BASED", supervisorIds: ["solo"] }, db);
    expect(ids).toEqual([]);
  });

  it("SUPERVISOR_BASED: overlapping anchors exclude ALL selected anchors", async () => {
    // vp and m1 both selected; m1 is below vp. Union of subtrees = {m1, e1}; both selected
    // anchors removed → only e1 remains.
    const db = fakeDb({ active: ["vp", "m1", "e1"], children: { vp: ["m1"], m1: ["e1"] } });
    const ids = await resolveAudience({ type: "SUPERVISOR_BASED", supervisorIds: ["vp", "m1"] }, db);
    expect(ids.sort()).toEqual(["e1"]);
    expect(ids).not.toContain("vp");
    expect(ids).not.toContain("m1");
  });

  it("SPECIFIC_TEAMS returns active members of the listed teams", async () => {
    const db = fakeDb({ active: ["a", "b"], children: {}, teamMembers: { t1: ["a", "b"], t2: ["x"] } });
    expect((await resolveAudience({ type: "SPECIFIC_TEAMS", teamIds: ["t1"] }, db)).sort()).toEqual(["a", "b"]);
  });
});
