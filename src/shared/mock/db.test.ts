import { readCollection, writeCollection, resetDemo } from "./db";
import type { DemoEmployee } from "./seed";

describe("mock db", () => {
  beforeEach(() => resetDemo());

  it("seeds the employees collection", () => {
    const employees = readCollection<DemoEmployee>("employees");
    expect(employees).toHaveLength(4);
    expect(employees.map((e) => e.role)).toContain("ADMIN");
  });

  it("persists writes within the namespace", () => {
    const rows = readCollection<DemoEmployee>("employees");
    writeCollection("employees", rows.slice(0, 1));
    expect(readCollection<DemoEmployee>("employees")).toHaveLength(1);
  });

  it("resetDemo restores the seed", () => {
    writeCollection("employees", []);
    resetDemo();
    expect(readCollection<DemoEmployee>("employees")).toHaveLength(4);
  });
});
