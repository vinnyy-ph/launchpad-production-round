import { queryKeys } from "@/shared/lib/query-keys";

describe("queryKeys", () => {
  it("builds stable dashboard and notification keys", () => {
    expect(queryKeys.dashboard.all).toEqual(["dashboard"]);
    expect(queryKeys.notifications.all).toEqual(["notifications"]);
    expect(queryKeys.notifications.list(5)).toEqual(["notifications", 5]);
  });

  it("builds employee list and detail keys", () => {
    expect(queryKeys.employees.all).toEqual(["employees"]);
    expect(queryKeys.employees.list()).toEqual(["employees", "list"]);
    expect(queryKeys.employees.list({ status: "ACTIVE" })).toEqual([
      "employees",
      "list",
      { status: "ACTIVE" },
    ]);
    expect(queryKeys.employees.detail("42")).toEqual(["employees", "detail", "42"]);
  });

  it("nests notifications.list under notifications.all so prefix invalidation works", () => {
    expect(queryKeys.notifications.list(10).slice(0, 1)).toEqual(queryKeys.notifications.all);
  });
});
