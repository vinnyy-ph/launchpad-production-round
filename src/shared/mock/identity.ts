import type { AppUser } from "@/modules/auth/types/auth.types";

export type DemoView = "ADMIN" | "HR" | "SUPERVISOR" | "EMPLOYEE";
export const DEMO_VIEWS: DemoView[] = ["ADMIN", "HR", "SUPERVISOR", "EMPLOYEE"];

// Four fixed demo identities the role switcher cycles through. Each maps to a
// real employee row in the seed (same userId/employeeId), so screens that look
// up "me" resolve correctly. Supervisor is EMPLOYEE + isSupervisor.
export const DEMO_PROFILES: Record<DemoView, AppUser> = {
  ADMIN: {
    userId: "u-admin", employeeId: "e-admin", role: "ADMIN",
    isSupervisor: false, isActive: true,
    email: "ava.reyes@swiftwork.demo", displayName: "Ava Reyes",
  },
  HR: {
    userId: "u-hr", employeeId: "e-hr", role: "HR",
    isSupervisor: false, isActive: true,
    email: "noah.cruz@swiftwork.demo", displayName: "Noah Cruz",
  },
  SUPERVISOR: {
    userId: "u-sup", employeeId: "e-sup", role: "EMPLOYEE",
    isSupervisor: true, isActive: true,
    email: "mia.santos@swiftwork.demo", displayName: "Mia Santos",
  },
  EMPLOYEE: {
    userId: "u-emp", employeeId: "e-emp", role: "EMPLOYEE",
    isSupervisor: false, isActive: true,
    email: "liam.tan@swiftwork.demo", displayName: "Liam Tan",
  },
};

export const DEFAULT_VIEW: DemoView = "ADMIN";
