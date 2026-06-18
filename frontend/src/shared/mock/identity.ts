import type { AppUser } from "@/modules/auth/types/auth.types";

export type DemoView = "ADMIN" | "HR" | "SUPERVISOR" | "EMPLOYEE" | "NEWHIRE";
// Order shown in the role switcher. NEWHIRE last — it's the cold-start demo.
export const DEMO_VIEWS: DemoView[] = ["ADMIN", "HR", "SUPERVISOR", "EMPLOYEE", "NEWHIRE"];

type SeededView = "ADMIN" | "HR" | "SUPERVISOR" | "EMPLOYEE";

// The four fixed, already-Active demo identities the seed builds employee rows
// from (same userId/employeeId), so screens that look up "me" resolve correctly.
// Supervisor is EMPLOYEE + isSupervisor.
export const DEMO_PROFILES: Record<SeededView, AppUser> = {
  ADMIN: {
    userId: "u-admin", employeeId: "e-admin", role: "ADMIN",
    isSupervisor: false, isActive: true, employeeStatus: "ACTIVE",
    email: "ava.reyes@swiftwork.demo", displayName: "Ava Reyes",
  },
  HR: {
    userId: "u-hr", employeeId: "e-hr", role: "HR",
    isSupervisor: false, isActive: true, employeeStatus: "ACTIVE",
    email: "noah.cruz@swiftwork.demo", displayName: "Noah Cruz",
  },
  SUPERVISOR: {
    userId: "u-sup", employeeId: "e-sup", role: "EMPLOYEE",
    isSupervisor: true, isActive: true, employeeStatus: "ACTIVE",
    email: "mia.santos@swiftwork.demo", displayName: "Mia Santos",
  },
  EMPLOYEE: {
    userId: "u-emp", employeeId: "e-emp", role: "EMPLOYEE",
    isSupervisor: false, isActive: true, employeeStatus: "ACTIVE",
    email: "liam.tan@swiftwork.demo", displayName: "Liam Tan",
  },
};

// The cold-start persona: a brand-new hire still in onboarding. Seeded with an
// ONBOARDING employee row + onboarding case, so the gate locks this view into the
// wizard until activation. Not part of DEMO_PROFILES (those seed Active rows).
export const NEW_HIRE_PROFILE: AppUser = {
  userId: "u-new", employeeId: "e-new", role: "EMPLOYEE",
  isSupervisor: false, isActive: true, employeeStatus: "ONBOARDING",
  email: "sam.rivera@swiftwork.demo", displayName: "Sam Rivera",
};

// All selectable views (login + role switcher resolve a view to its AppUser here).
export const VIEW_PROFILES: Record<DemoView, AppUser> = {
  ...DEMO_PROFILES,
  NEWHIRE: NEW_HIRE_PROFILE,
};

export const DEFAULT_VIEW: DemoView = "ADMIN";

// Maps a real signed-in Google email → which demo persona to land them on.
// Lookup is case-insensitive, so keys MUST be lowercase. Unknown accounts fall
// back to DEFAULT_VIEW and can still switch via the role switcher.
// Add teammate emails here → "ADMIN" | "HR" | "SUPERVISOR" | "EMPLOYEE" | "NEWHIRE".
export const EMAIL_TO_VIEW: Record<string, DemoView> = {
  "vnferrer.work@gmail.com": "ADMIN",
};
