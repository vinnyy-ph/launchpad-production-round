import {
  getFirstName,
  buildSummary,
  buildDashboardAttention,
  dashboardPrimaryAction,
  buildGlanceCards,
  groupNotifications,
} from "@/screens/home.logic";
import type { DashboardStats } from "@/modules/dashboard/hooks/use-dashboard";
import type { AppUser } from "@/modules/auth/types/auth.types";
import type { Notification } from "@/modules/notifications/types/notifications.types";

function stats(over: Partial<DashboardStats> = {}): DashboardStats {
  return { ...over };
}

describe("getFirstName", () => {
  it("uses the first token of the display name", () => {
    expect(getFirstName({ displayName: "Jia Recruiter" } as AppUser)).toBe("Jia");
  });
  it("falls back to the email local part", () => {
    expect(getFirstName({ email: "jia.applicant@x.com" } as AppUser)).toBe("jia.applicant");
  });
  it("is empty when nothing is available", () => {
    expect(getFirstName(null)).toBe("");
  });
});

describe("buildDashboardAttention", () => {
  it("returns empty when stats are null", () => {
    expect(buildDashboardAttention({ role: "EMPLOYEE", isSupervisor: false, employeeStatus: "ACTIVE", stats: null })).toEqual([]);
  });
  it("includes only non-zero items, personal → team → org, with the right hrefs", () => {
    const items = buildDashboardAttention({
      role: "HR",
      isSupervisor: true,
      employeeStatus: "ACTIVE",
      stats: stats({ pendingAcknowledgements: 2, unreadSurveys: 1, pendingEvaluations: 3, pendingOnboarding: 1, pendingOffboarding: 0, pendingClearances: 4 }),
    });
    expect(items.map((i) => i.id)).toEqual(["acks", "surveys", "drafts", "onboarding", "clearances"]);
    expect(items.find((i) => i.id === "acks")?.href).toBe("/employee/surveys?tab=acknowledgements");
    expect(items.find((i) => i.id === "surveys")?.href).toBe("/employee/surveys");
    expect(items.find((i) => i.id === "drafts")?.href).toBe("/supervisor/evaluations?status=draft");
    expect(items.find((i) => i.id === "onboarding")?.href).toBe("/hr/directory/onboarding");
    expect(items.find((i) => i.id === "clearances")?.href).toBe("/hr/directory/offboarding");
  });
  it("gates the supervisor and HR lanes", () => {
    const items = buildDashboardAttention({
      role: "EMPLOYEE",
      isSupervisor: false,
      employeeStatus: "ACTIVE",
      stats: stats({ pendingEvaluations: 5, pendingOnboarding: 2 }),
    });
    expect(items).toEqual([]); // neither lane held
  });
  it("shows onboarding documents only while ONBOARDING", () => {
    const onboarding = buildDashboardAttention({ role: "EMPLOYEE", isSupervisor: false, employeeStatus: "ONBOARDING", stats: stats({ pendingDocuments: 2 }) });
    expect(onboarding.map((i) => i.id)).toEqual(["documents"]);
    const active = buildDashboardAttention({ role: "EMPLOYEE", isSupervisor: false, employeeStatus: "ACTIVE", stats: stats({ pendingDocuments: 2 }) });
    expect(active).toEqual([]);
  });
  it("uses singular/plural copy", () => {
    const one = buildDashboardAttention({ role: "EMPLOYEE", isSupervisor: false, employeeStatus: "ACTIVE", stats: stats({ pendingAcknowledgements: 1 }) })[0];
    expect(one.label).toBe("1 evaluation to acknowledge");
    const many = buildDashboardAttention({ role: "EMPLOYEE", isSupervisor: false, employeeStatus: "ACTIVE", stats: stats({ pendingAcknowledgements: 3 }) })[0];
    expect(many.label).toBe("3 evaluations to acknowledge");
  });
});

describe("dashboardPrimaryAction", () => {
  it("is the highest-priority item", () => {
    const items = buildDashboardAttention({ role: "EMPLOYEE", isSupervisor: true, employeeStatus: "ACTIVE", stats: stats({ unreadSurveys: 1, pendingEvaluations: 2 }) });
    expect(dashboardPrimaryAction(items)?.id).toBe("surveys");
  });
  it("is null when there is nothing to do", () => {
    expect(dashboardPrimaryAction([])).toBeNull();
  });
});

describe("buildGlanceCards", () => {
  it("returns empty when stats are null", () => {
    expect(buildGlanceCards({ role: "EMPLOYEE", isSupervisor: false, employeeStatus: "ACTIVE", stats: null })).toEqual([]);
  });
  it("shows supervisor context with an evals-complete progress percent", () => {
    const cards = buildGlanceCards({ role: "EMPLOYEE", isSupervisor: true, employeeStatus: "ACTIVE", stats: stats({ directReports: 4, completedEvaluations: 1, totalEvaluations: 2 }) });
    expect(cards.map((c) => c.id)).toEqual(["direct-reports", "evals-complete"]);
    expect(cards.find((c) => c.id === "evals-complete")?.value).toBe("1/2");
    expect(cards.find((c) => c.id === "evals-complete")?.progress).toBe(50);
  });
  it("shows HR active employees and the onboarding-progress card only while ONBOARDING", () => {
    const hr = buildGlanceCards({ role: "HR", isSupervisor: false, employeeStatus: "ACTIVE", stats: stats({ activeEmployees: 42 }) });
    expect(hr.map((c) => c.id)).toEqual(["active-employees"]);
    const onboarding = buildGlanceCards({ role: "EMPLOYEE", isSupervisor: false, employeeStatus: "ONBOARDING", stats: stats({ onboardingProgress: 60 }) });
    expect(onboarding[0]).toMatchObject({ id: "onboarding-progress", value: "60%", progress: 60 });
  });
  it("omits actionable items (no surveys/acks/pending cards)", () => {
    const cards = buildGlanceCards({ role: "HR", isSupervisor: true, employeeStatus: "ACTIVE", stats: stats({ unreadSurveys: 9, pendingEvaluations: 9, pendingOnboarding: 9, directReports: 1, activeEmployees: 1 }) });
    expect(cards.map((c) => c.id).sort()).toEqual(["active-employees", "direct-reports"]);
  });
});

describe("groupNotifications", () => {
  function notif(over: Partial<Notification> = {}): Notification {
    return {
      id: "n1",
      type: "PULSE_REMINDER",
      subject: "Weekly Pulse survey",
      body: "Answer the Weekly Team Pulse",
      linkUrl: "/surveys/1",
      isRead: false,
      createdAt: "2026-06-24T08:00:00.000Z",
      ...over,
    };
  }

  it("collapses same subject+body into one row, keeping the most recent and a count", () => {
    const rows = groupNotifications([
      notif({ id: "a", createdAt: "2026-06-24T10:00:00.000Z" }),
      notif({ id: "b", createdAt: "2026-06-24T08:00:00.000Z" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(2);
    expect(rows[0].notification.id).toBe("a"); // newest kept
  });

  it("keeps distinct notifications separate with count 1", () => {
    const rows = groupNotifications([
      notif({ id: "a", subject: "Weekly Pulse survey" }),
      notif({ id: "b", subject: "Evaluation ready", body: "Acknowledge your review" }),
    ]);
    expect(rows.map((r) => r.notification.id)).toEqual(["a", "b"]);
    expect(rows.every((r) => r.count === 1)).toBe(true);
  });

  it("preserves first-appearance order of a newest-first feed", () => {
    const rows = groupNotifications([
      notif({ id: "a", subject: "A" }),
      notif({ id: "b", subject: "B" }),
      notif({ id: "c", subject: "A" }),
    ]);
    expect(rows.map((r) => r.notification.subject)).toEqual(["A", "B"]);
    expect(rows[0].count).toBe(2);
  });

  it("returns an empty list for no notifications", () => {
    expect(groupNotifications([])).toEqual([]);
  });
});

describe("buildSummary", () => {
  it("is all-caught-up when nothing is pending", () => {
    expect(buildSummary("EMPLOYEE", false, stats({}))).toBe("You're all caught up — nice work.");
  });
  it("lists what is waiting across hats", () => {
    expect(buildSummary("HR", true, stats({ unreadSurveys: 1, pendingEvaluations: 2 }))).toBe("You have 1 survey to answer and 2 evaluations to finish.");
  });
});
