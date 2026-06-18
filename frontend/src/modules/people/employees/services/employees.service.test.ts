import { getEmployees } from "./employees.service";
import { resetDemo } from "@/shared/mock/db";

describe("getEmployees (mock)", () => {
  beforeEach(() => resetDemo());

  it("returns the seeded employees mapped to directory rows", async () => {
    const rows = await getEmployees();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        companyEmail: expect.any(String),
        employeeStatus: expect.any(String),
      }),
    );
  });

  it("filters by status", async () => {
    const active = await getEmployees({ status: "ACTIVE" });
    expect(active.every((r) => r.employeeStatus === "ACTIVE")).toBe(true);
  });

  it("filters by search across name and email", async () => {
    const all = await getEmployees();
    const target = all[0];
    const query = target.companyEmail.split("@")[0].slice(0, 3);
    const hits = await getEmployees({ search: query });
    expect(hits.some((r) => r.id === target.id)).toBe(true);
  });
});
