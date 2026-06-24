import {
  getFirstName,
  buildSummary,
  buildDashboardAttention,
  dashboardPrimaryAction,
  buildGlanceCards,
} from "@/screens/home.logic";
import type { DashboardStats } from "@/modules/dashboard/hooks/use-dashboard";
import type { AppUser } from "@/modules/auth/types/auth.types";

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

describe("buildSummary", () => {
  it("is all-caught-up when nothing is pending", () => {
    expect(buildSummary("EMPLOYEE", false, stats({}))).toBe("You're all caught up — nice work.");
  });
  it("lists what is waiting across hats", () => {
    expect(buildSummary("HR", true, stats({ unreadSurveys: 1, pendingEvaluations: 2 }))).toBe("You have 1 survey to answer and 2 evaluations to finish.");
  });
});
