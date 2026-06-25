import { buildResponseRow } from "./response-firewall";

const base = {
  occurrenceId: "occ1",
  employeeId: "emp1",
  respondentSupervisorId: "sup1",
  respondentTeamIds: ["t1", "t2"],
};

describe("buildResponseRow (anonymity firewall)", () => {
  it("drops the employee link for anonymous surveys but keeps grouping snapshots", () => {
    const row = buildResponseRow({ ...base, isAnonymous: true });
    expect(row.employeeId).toBeNull();
    expect(row.respondentSupervisorId).toBe("sup1");
    expect(row.respondentTeamIds).toEqual(["t1", "t2"]);
  });

  it("keeps the employee link for non-anonymous surveys", () => {
    const row = buildResponseRow({ ...base, isAnonymous: false });
    expect(row.employeeId).toBe("emp1");
  });
});
