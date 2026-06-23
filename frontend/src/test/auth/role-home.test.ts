/**
 * @jest-environment node
 */

import { roleHome } from "@/modules/auth/role-home";
import type { AppUser } from "@/modules/auth/types/auth.types";

function user(overrides: Partial<AppUser> = {}): AppUser {
  return {
    userId: "user-id",
    employeeId: "employee-id",
    role: "EMPLOYEE",
    isSupervisor: false,
    isActive: true,
    employeeStatus: "ACTIVE",
    email: "employee@example.com",
    displayName: "Employee",
    ...overrides,
  };
}

describe("roleHome", () => {
  it("lands HR users on home after login", () => {
    expect(roleHome(user({ role: "HR" }))).toBe("/");
  });

  it("lands supervisors on home after login", () => {
    expect(roleHome(user({ isSupervisor: true }))).toBe("/");
  });

  it("keeps admins on user management after login", () => {
    expect(roleHome(user({ role: "ADMIN" }))).toBe("/admin/users");
  });

  it("keeps onboarding users in the onboarding wizard", () => {
    expect(roleHome(user({ role: "HR", isSupervisor: true, employeeStatus: "ONBOARDING" }))).toBe(
      "/employee/onboarding",
    );
  });
});
