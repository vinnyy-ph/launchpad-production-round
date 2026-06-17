import { DEMO_PROFILES } from "./identity";
import type { Notification } from "@/modules/notifications/types/notifications.types";

// Minimal employee row shape used across the demo. Module plans may widen this.
export interface DemoEmployee {
  employeeId: string;
  userId: string;
  displayName: string;
  email: string;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  isSupervisor: boolean;
  isActive: boolean;
  jobTitle: string;
  department: string;
}

function seedEmployees(): DemoEmployee[] {
  return Object.values(DEMO_PROFILES).map((p) => ({
    employeeId: p.employeeId,
    userId: p.userId,
    displayName: p.displayName ?? p.email,
    email: p.email,
    role: p.role,
    isSupervisor: p.isSupervisor,
    isActive: p.isActive,
    jobTitle:
      p.role === "ADMIN" ? "People Ops Admin"
      : p.role === "HR" ? "HR Business Partner"
      : p.isSupervisor ? "Engineering Lead"
      : "Software Engineer",
    department: p.role === "HR" ? "People" : "Engineering",
  }));
}

function seedNotifications(): Notification[] {
  return [
    { id: "n1", type: "NEW_PULSE", subject: "New pulse survey", body: "Q2 engagement pulse is open.", linkUrl: "/employee/surveys", isRead: false, createdAt: "2026-06-16T09:00:00.000Z" },
    { id: "n2", type: "NEW_EVALUATION", subject: "Evaluation shared", body: "Your H1 evaluation is ready to acknowledge.", linkUrl: "/employee/profile", isRead: false, createdAt: "2026-06-15T14:30:00.000Z" },
    { id: "n3", type: "CLEARANCE_SIGN_REQUEST", subject: "Clearance needs your sign-off", body: "L. Tan's IT clearance is awaiting you.", linkUrl: "/hr/offboarding", isRead: false, createdAt: "2026-06-15T11:00:00.000Z" },
    { id: "n4", type: "ONBOARDING_COMPLETE", subject: "Onboarding complete", body: "M. Santos finished onboarding.", linkUrl: "/hr/onboarding", isRead: true, createdAt: "2026-06-14T08:00:00.000Z" },
    { id: "n5", type: "PULSE_REMINDER", subject: "Pulse reminder", body: "2 days left to submit the engagement pulse.", linkUrl: "/employee/surveys", isRead: true, createdAt: "2026-06-13T08:00:00.000Z" },
  ];
}

export function buildSeed(): Record<string, unknown[]> {
  return {
    employees: seedEmployees(),
    notifications: seedNotifications(),
    // Module plans append: teams, users, onboardingCases, offboardingCases,
    // surveys, surveyResponses, evaluations, ...
  };
}
