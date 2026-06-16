import { ACTIVE_EMPLOYEE, isActiveEmployee } from "./active";

describe("ACTIVE_EMPLOYEE where-fragment", () => {
  it("matches an ACTIVE employee whose account is not deactivated", () => {
    // Pins the rule to the real schema: Employee.status + User.isActive (no accountStatus).
    expect(ACTIVE_EMPLOYEE).toEqual({
      status: "ACTIVE",
      user: { is: { isActive: true } },
    });
  });
});

describe("isActiveEmployee", () => {
  it("is true for ACTIVE status with an active account", () => {
    expect(isActiveEmployee({ status: "ACTIVE", user: { isActive: true } })).toBe(true);
  });

  it("is false for an ACTIVE employee whose account is deactivated", () => {
    expect(isActiveEmployee({ status: "ACTIVE", user: { isActive: false } })).toBe(false);
  });

  it("is false for any non-ACTIVE employee status", () => {
    for (const status of ["ONBOARDING", "OFFBOARDING", "INACTIVE"]) {
      expect(isActiveEmployee({ status, user: { isActive: true } })).toBe(false);
    }
  });

  it("is false when the user relation is missing", () => {
    expect(isActiveEmployee({ status: "ACTIVE", user: null })).toBe(false);
    expect(isActiveEmployee({ status: "ACTIVE" })).toBe(false);
  });
});
