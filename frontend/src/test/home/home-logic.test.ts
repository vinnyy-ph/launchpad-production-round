import {
  getFirstName,
  computeGreeting,
  buildAttentionZones,
  buildPriority,
  buildOrgHealth,
  rowAriaLabel,
} from "@/screens/home.logic";
import type { DashboardStats } from "@/modules/dashboard/hooks/use-dashboard";
import type { AppUser, EmployeeStatus } from "@/modules/auth/types/auth.types";

function stats(over: Partial<DashboardStats> = {}): DashboardStats {
  return { ...over } as DashboardStats;
}

type ZoneInput = Parameters<typeof buildAttentionZones>[0];
function zoneInput(over: Partial<ZoneInput> = {}): ZoneInput {
  return {
    role: "EMPLOYEE",
    isSupervisor: false,
    employeeStatus: "ACTIVE" as EmployeeStatus,
    stats: null,
    pendingSignatures: 0,
    ...over,
  };
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

describe("computeGreeting", () => {
  // Jan 1 2026 is a Thursday, so these avoid the Friday branch unless stated.
  const at = (h: number, day = 1) => new Date(2026, 0, day, h, 0);
  it("appends the first name when present", () => {
    expect(computeGreeting(at(9), "Jia")).toBe("Good morning, Jia");
  });
  it("omits the suffix when there is no name", () => {
    expect(computeGreeting(at(9), "")).toBe("Good morning");
  });
  it("uses the edge bands at the extremes", () => {
    expect(computeGreeting(at(22), "Jia")).toBe("Working late, Jia");
    expect(computeGreeting(at(3), "Jia")).toBe("Working late, Jia");
    expect(computeGreeting(at(6), "Jia")).toBe("Early start, Jia");
  });
  it("uses the time-of-day bands", () => {
    expect(computeGreeting(at(9), "Jia")).toBe("Good morning, Jia");
    expect(computeGreeting(at(14), "Jia")).toBe("Good afternoon, Jia");
    expect(computeGreeting(at(19), "Jia")).toBe("Good evening, Jia");
  });
  it("greets Friday, but only inside the day bands", () => {
    // Jan 2 2026 is a Friday.
    expect(computeGreeting(at(9, 2), "Jia")).toBe("Happy Friday, Jia");
    // Edge bands still win over Friday.
    expect(computeGreeting(at(22, 2), "Jia")).toBe("Working late, Jia");
  });
});

describe("buildAttentionZones", () => {
  it("gates the team and organization lanes by role", () => {
    const z = buildAttentionZones(zoneInput({ stats: stats({ pendingEvaluations: 5, pendingOnboarding: 2 }) }));
    expect(z.forYou).toEqual([]);
    expect(z.yourTeam).toBeNull(); // not a supervisor
    expect(z.organization).toBeNull(); // not HR/ADMIN
  });

  it("fills the personal lane with only non-zero, backed items and the right hrefs", () => {
    const z = buildAttentionZones(
      zoneInput({
        pendingSignatures: 1,
        stats: stats({ pendingAcknowledgements: 2, unreadSurveys: 1 }),
      }),
    );
    expect(z.forYou.map((r) => r.id)).toEqual(["sign", "acks", "pulses"]);
    expect(z.forYou.find((r) => r.id === "acks")?.href).toBe("/employee/surveys?tab=acknowledgements");
    expect(z.forYou.find((r) => r.id === "pulses")?.href).toBe("/employee/surveys");
  });

  it("shows onboarding documents only while ONBOARDING", () => {
    const onboarding = buildAttentionZones(
      zoneInput({ employeeStatus: "ONBOARDING" as EmployeeStatus, stats: stats({ pendingDocuments: 2 }) }),
    );
    expect(onboarding.forYou.map((r) => r.id)).toEqual(["docs"]);
    const active = buildAttentionZones(zoneInput({ stats: stats({ pendingDocuments: 2 }) }));
    expect(active.forYou).toEqual([]);
  });

  it("fills the supervisor and organization lanes when held", () => {
    const z = buildAttentionZones(
      zoneInput({
        role: "HR",
        isSupervisor: true,
        stats: stats({ pendingEvaluations: 3, pendingOnboarding: 1, pendingOffboarding: 0, pendingClearances: 4 }),
      }),
    );
    expect(z.yourTeam?.map((r) => r.id)).toEqual(["drafts"]);
    expect(z.yourTeam?.[0].href).toBe("/supervisor/evaluations?status=draft");
    // pendingOffboarding is 0, so it's omitted.
    expect(z.organization?.map((r) => r.id)).toEqual(["onboard", "clear"]);
  });

  it("uses singular/plural copy", () => {
    const one = buildAttentionZones(zoneInput({ stats: stats({ pendingAcknowledgements: 1 }) })).forYou[0];
    expect(one.label).toBe("1 evaluation to acknowledge");
    const many = buildAttentionZones(zoneInput({ stats: stats({ pendingAcknowledgements: 3 }) })).forYou[0];
    expect(many.label).toBe("3 evaluations to acknowledge");
  });
});

describe("buildPriority", () => {
  it("counts every pending row across all zones", () => {
    const z = buildAttentionZones(
      zoneInput({ isSupervisor: true, stats: stats({ unreadSurveys: 1, pendingEvaluations: 2 }) }),
    );
    expect(buildPriority(z).count).toBe(2);
  });
  it("promotes the highest-priority row as the primary action", () => {
    // drafts (rank 3) outranks pulses (rank 4).
    const z = buildAttentionZones(
      zoneInput({ isSupervisor: true, stats: stats({ unreadSurveys: 1, pendingEvaluations: 2 }) }),
    );
    expect(buildPriority(z).primary?.id).toBe("drafts");
  });
  it("has no primary when nothing is pending", () => {
    const empty = { forYou: [], yourTeam: null, organization: null };
    expect(buildPriority(empty)).toEqual({ count: 0, primary: null });
  });
});

describe("buildOrgHealth", () => {
  it("is empty for non-HR roles", () => {
    expect(buildOrgHealth("EMPLOYEE", stats({ pendingClearances: 4 }))).toEqual([]);
  });
  it("surfaces active-employees and clearances cards for HR when the fields are present", () => {
    const cards = buildOrgHealth("HR", stats({ activeEmployees: 42, pendingClearances: 4 }));
    expect(cards.map((c) => c.id)).toEqual(["active-employees", "clearances"]);
    expect(cards.find((c) => c.id === "active-employees")).toMatchObject({ count: 42, unit: "people" });
    expect(cards.find((c) => c.id === "clearances")).toMatchObject({ count: 4, unit: "clearances" });
  });
  it("uses singular units for a count of one", () => {
    expect(buildOrgHealth("HR", stats({ activeEmployees: 1 }))[0].unit).toBe("person");
    expect(buildOrgHealth("HR", stats({ pendingClearances: 1 }))[0].unit).toBe("clearance");
  });
  it("omits the card when the field is absent", () => {
    expect(buildOrgHealth("HR", stats())).toEqual([]);
  });
});

describe("rowAriaLabel", () => {
  it("reads as action then label", () => {
    expect(
      rowAriaLabel({ id: "pulses", count: 1, label: "1 pulse survey to answer", action: "Answer surveys", href: "/employee/surveys" }),
    ).toBe("Answer surveys — 1 pulse survey to answer");
  });
});
