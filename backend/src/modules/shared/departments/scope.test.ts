import { crossesDepartment } from "./scope";

describe("crossesDepartment", () => {
  it("allows a manager and member in the same department", () => {
    expect(crossesDepartment("dept-a", "dept-a")).toBe(false);
  });

  it("blocks a manager and member in different departments", () => {
    expect(crossesDepartment("dept-a", "dept-b")).toBe(true);
  });

  it("exempts a member with no department", () => {
    expect(crossesDepartment(null, "dept-a")).toBe(false);
    expect(crossesDepartment(undefined, "dept-a")).toBe(false);
  });

  it("exempts a manager with no department", () => {
    expect(crossesDepartment("dept-a", null)).toBe(false);
    expect(crossesDepartment("dept-a", undefined)).toBe(false);
  });

  it("exempts when neither has a department", () => {
    expect(crossesDepartment(null, null)).toBe(false);
  });
});
