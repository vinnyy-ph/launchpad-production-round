import { DEMO_PROFILES } from "./identity";
import type {
  Acknowledgement,
  DemoEmployee,
  Evaluation,
  OffboardingCase,
  OnboardingCase,
  Survey,
  SurveyResponse,
  Team,
  UserAccount,
} from "./types";
import type { Notification } from "@/modules/notifications/types/notifications.types";

// Back-compat: existing code imports DemoEmployee from "@/shared/mock/seed".
export type { DemoEmployee } from "./types";

// ─── employees ──────────────────────────────────────────────────────────────
// The 4 demo identities (auth + role switcher reference these ids) + 16 more,
// across departments/teams with varied status and supervisor links.

const demoRows = (): DemoEmployee[] =>
  Object.values(DEMO_PROFILES).map((p) => ({
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
    employeeStatus: "ACTIVE" as const,
    supervisorId: p.employeeId === "e-emp" ? "e-sup" : null,
    teamId: p.role === "HR" ? "t-people" : "t-eng",
    startDate: "2024-02-01",
  }));

// [id, name, dept, team, title, status, supervisorId, isSupervisor]
const EXTRA: [string, string, string, string, string, DemoEmployee["employeeStatus"], string | null, boolean][] = [
  ["e1", "Grace Lim", "Engineering", "t-eng", "Senior Engineer", "ACTIVE", "e-sup", false],
  ["e2", "Daniel Cruz", "Engineering", "t-eng", "Software Engineer", "ACTIVE", "e-sup", false],
  ["e3", "Hannah Reyes", "Engineering", "t-eng", "QA Engineer", "ONBOARDING", "e-sup", false],
  ["e4", "Marco Tan", "Engineering", "t-eng", "Platform Engineer", "OFFBOARDING", "e-sup", false],
  ["e5", "Priya Nair", "Design", "t-design", "Design Lead", "ACTIVE", null, true],
  ["e6", "Leo Santos", "Design", "t-design", "Product Designer", "ACTIVE", "e5", false],
  ["e7", "Aisha Khan", "Design", "t-design", "UX Researcher", "ONBOARDING", "e5", false],
  ["e8", "Tomas Rivera", "Sales", "t-sales", "Sales Lead", "ACTIVE", null, true],
  ["e9", "Bea Flores", "Sales", "t-sales", "Account Executive", "ACTIVE", "e8", false],
  ["e10", "Karl Mendoza", "Sales", "t-sales", "Account Executive", "INACTIVE", "e8", false],
  ["e11", "Sofia Dela Cruz", "People", "t-people", "Recruiter", "ACTIVE", "e-hr", false],
  ["e12", "Ivan Garcia", "People", "t-people", "People Ops Specialist", "ACTIVE", "e-hr", false],
  ["e13", "Nadia Yusof", "Finance", "t-finance", "Finance Lead", "ACTIVE", null, true],
  ["e14", "Owen Park", "Finance", "t-finance", "Accountant", "ACTIVE", "e13", false],
  ["e15", "Rina Sato", "Engineering", "t-eng", "Engineer", "ONBOARDING", "e-sup", false],
  ["e16", "Diego Cruz", "Sales", "t-sales", "SDR", "OFFBOARDING", "e8", false],
];

function seedEmployees(): DemoEmployee[] {
  const extra: DemoEmployee[] = EXTRA.map(([id, name, dept, team, title, status, supId, isSup]) => ({
    employeeId: id,
    userId: `u-${id}`,
    displayName: name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@swiftwork.demo`,
    role: "EMPLOYEE",
    isSupervisor: isSup,
    isActive: status === "ACTIVE" || status === "ONBOARDING" || status === "OFFBOARDING",
    jobTitle: title,
    department: dept,
    employeeStatus: status,
    supervisorId: supId,
    teamId: team,
    startDate: "2023-09-15",
  }));
  return [...demoRows(), ...extra];
}

// ─── users (admin user management) ───────────────────────────────────────────
function seedUsers(): UserAccount[] {
  return seedEmployees().map((e) => ({
    id: e.userId,
    employeeId: e.employeeId,
    email: e.email,
    role: e.role,
    isActive: e.isActive,
    lastActiveAt: "2026-06-17T08:00:00.000Z",
  }));
}

// ─── teams (org chart) ───────────────────────────────────────────────────────
function seedTeams(): Team[] {
  const members = (teamId: string) => seedEmployees().filter((e) => e.teamId === teamId).map((e) => e.employeeId);
  return [
    { id: "t-root", name: "SwiftWork", parentId: null, leadEmployeeId: "e-admin", memberIds: [] },
    { id: "t-eng", name: "Engineering", parentId: "t-root", leadEmployeeId: "e-sup", memberIds: members("t-eng") },
    { id: "t-people", name: "People", parentId: "t-root", leadEmployeeId: "e-hr", memberIds: members("t-people") },
    { id: "t-design", name: "Design", parentId: "t-root", leadEmployeeId: "e5", memberIds: members("t-design") },
    { id: "t-sales", name: "Sales", parentId: "t-root", leadEmployeeId: "e8", memberIds: members("t-sales") },
    { id: "t-finance", name: "Finance", parentId: "t-root", leadEmployeeId: "e13", memberIds: members("t-finance") },
  ];
}

// ─── onboarding cases (ONBOARDING-status employees) ──────────────────────────
function seedOnboarding(): OnboardingCase[] {
  const mk = (id: string, employeeId: string, status: OnboardingCase["status"], progress: number, docs: OnboardingCase["documents"]): OnboardingCase => ({
    id, employeeId, status, progress,
    customFields: [
      { label: "T-shirt size", value: "M" },
      { label: "Emergency contact", value: "—" },
      { label: "Equipment", value: "Laptop (MacBook Pro)" },
    ],
    documents: docs,
    invitedAt: "2026-06-10T09:00:00.000Z",
  });
  return [
    mk("ob1", "e3", "DOCS_REVIEW", 75, [
      { name: "Signed contract", status: "APPROVED" },
      { name: "Government ID", status: "SUBMITTED" },
      { name: "Tax form", status: "PENDING" },
    ]),
    mk("ob2", "e7", "IN_PROGRESS", 40, [
      { name: "Signed contract", status: "SUBMITTED" },
      { name: "Government ID", status: "PENDING" },
    ]),
    mk("ob3", "e15", "INVITED", 10, [
      { name: "Signed contract", status: "PENDING" },
    ]),
  ];
}

// ─── offboarding cases (OFFBOARDING-status employees) ────────────────────────
function seedOffboarding(): OffboardingCase[] {
  return [
    {
      id: "of1", employeeId: "e4", status: "CLEARANCES", lastDay: "2026-06-30", reason: "Resignation",
      clearances: [
        { dept: "IT", ownerEmployeeId: "e-sup", status: "PENDING" },
        { dept: "Finance", ownerEmployeeId: "e13", status: "SIGNED" },
        { dept: "People", ownerEmployeeId: "e-hr", status: "PENDING" },
      ],
    },
    {
      id: "of2", employeeId: "e16", status: "INITIATED", lastDay: "2026-07-15", reason: "End of contract",
      clearances: [
        { dept: "IT", ownerEmployeeId: "e-sup", status: "PENDING" },
        { dept: "Sales Ops", ownerEmployeeId: "e8", status: "PENDING" },
      ],
    },
  ];
}

// ─── surveys + responses (Performance) ───────────────────────────────────────
function seedSurveys(): Survey[] {
  return [
    {
      id: "sv1", title: "Q2 engagement pulse", description: "How are you feeling about work this quarter?",
      questions: [
        { id: "q1", type: "RATING", prompt: "How satisfied are you at work?", scaleMin: 1, scaleMax: 5, scaleMinLabel: "Not at all", scaleMaxLabel: "Extremely", required: true },
        { id: "q2", type: "SINGLE", prompt: "Do you feel supported by your manager?", options: ["Yes", "Somewhat", "No"], required: true },
        { id: "q3", type: "TEXT", prompt: "What would make work better?", multiline: true, maxChars: 500 },
      ],
      anonymous: false, minGroupSize: 4, recurrence: "QUARTERLY", status: "ACTIVE", createdAt: "2026-06-10T09:00:00.000Z",
      audienceType: "EVERYONE", audience: "All employees",
      releaseDate: "2026-06-10", deadline: "2026-06-20", reminderType: "WEEKLY",
      visibilityScope: "SUPERVISOR_BASED",
    },
    {
      id: "sv2", title: "Onboarding experience", description: "For employees in their first 90 days.",
      questions: [
        { id: "q1", type: "RATING", prompt: "How smooth was your onboarding?", scaleMin: 1, scaleMax: 5, scaleMinLabel: "Rough", scaleMaxLabel: "Seamless" },
        { id: "q2", type: "MULTI", prompt: "What helped most?", options: ["Buddy", "Docs", "Manager", "Team"] },
      ],
      anonymous: false, minGroupSize: 3, recurrence: "NONE", status: "DRAFT", createdAt: "2026-06-14T09:00:00.000Z",
      audienceType: "SPECIFIC_TEAMS", audienceTeamIds: ["t-eng"], audience: "Engineering",
      releaseDate: "2026-07-01", deadline: "2026-07-10", reminderType: "EVERY_X_DAYS", reminderIntervalDays: 3,
      visibilityScope: "HR_ADMIN",
    },
  ];
}

function seedSurveyResponses(): SurveyResponse[] {
  return [
    { id: "sr1", surveyId: "sv1", employeeId: "e1", answers: { q1: 4, q2: "Yes", q3: "More focus time." }, submittedAt: "2026-06-12T10:00:00.000Z" },
    { id: "sr2", surveyId: "sv1", employeeId: "e2", answers: { q1: 5, q2: "Yes", q3: "" }, submittedAt: "2026-06-12T11:00:00.000Z" },
    { id: "sr3", surveyId: "sv1", employeeId: "e6", answers: { q1: 3, q2: "Somewhat", q3: "Clearer goals." }, submittedAt: "2026-06-13T09:00:00.000Z" },
    { id: "sr4", surveyId: "sv1", employeeId: "e9", answers: { q1: 4, q2: "Yes", q3: "" }, submittedAt: "2026-06-13T14:00:00.000Z" },
    { id: "sr5", surveyId: "sv1", employeeId: "e12", answers: { q1: 2, q2: "No", q3: "Workload." }, submittedAt: "2026-06-14T08:00:00.000Z" },
  ];
}

// ─── evaluations + acknowledgements (Performance) ────────────────────────────
function seedEvaluations(): Evaluation[] {
  const ratings = (a: number, b: number, c: number) => [
    { competency: "Delivery", score: a },
    { competency: "Collaboration", score: b },
    { competency: "Growth", score: c },
  ];
  return [
    {
      id: "ev1", employeeId: "e-emp", supervisorId: "e-sup", period: "H1 2026", status: "SHARED",
      sharedAt: "2026-06-15T14:30:00.000Z", ackDeadline: "2026-06-29T00:00:00.000Z",
      grade: 4,
      highlights: ["Shipped the billing revamp ahead of schedule", "Mentored two new engineers"],
      lowlights: ["Estimates ran long on the search project"],
      evaluationText: "A strong half. Reliable delivery, steady ownership, and great teamwork across the squad.",
      recommendationText: "Ready for a senior scope next cycle — pair on system design to close the estimation gap.",
      supportingDocs: ["H1-goals.pdf", "peer-feedback.pdf"],
      ratings: ratings(4, 5, 4), summary: "Strong half — reliable delivery and great teamwork.",
    },
    {
      id: "ev2", employeeId: "e1", supervisorId: "e-sup", period: "H1 2026", status: "ACKNOWLEDGED",
      sharedAt: "2026-06-10T09:00:00.000Z", ackDeadline: "2026-06-24T00:00:00.000Z",
      grade: 5,
      highlights: ["Led the platform migration", "Set the code-review bar for the team"],
      lowlights: ["Could delegate more"],
      evaluationText: "Exceptional technical leadership across the half.",
      recommendationText: "Tech-lead track. Hand off more implementation to grow the team.",
      supportingDocs: [],
      ratings: ratings(5, 4, 5), summary: "Exceptional technical leadership.",
    },
    {
      id: "ev3", employeeId: "e2", supervisorId: "e-sup", period: "H1 2026", status: "DRAFT",
      sharedAt: null, ackDeadline: null,
      grade: 3, highlights: [], lowlights: [], evaluationText: "", recommendationText: "", supportingDocs: [],
      ratings: ratings(3, 4, 3), summary: "",
    },
    {
      id: "ev4", employeeId: "e9", supervisorId: "e8", period: "H1 2026", status: "DEEMED_ACKNOWLEDGED",
      sharedAt: "2026-05-20T09:00:00.000Z", ackDeadline: "2026-06-03T00:00:00.000Z",
      grade: 3,
      highlights: ["Consistent quota attainment"],
      lowlights: ["Pipeline hygiene needs work"],
      evaluationText: "Solid, dependable half with room to tighten pipeline discipline.",
      recommendationText: "Coaching on CRM hygiene; on track.",
      supportingDocs: [],
      ratings: ratings(3, 3, 4), summary: "Solid, dependable half.",
    },
  ];
}

function seedAcknowledgements(): Acknowledgement[] {
  return [
    { id: "ak1", evaluationId: "ev1", employeeId: "e-emp", acknowledgedAt: null, deemedAt: null },
    { id: "ak2", evaluationId: "ev2", employeeId: "e1", acknowledgedAt: "2026-06-12T10:00:00.000Z", deemedAt: null },
    { id: "ak3", evaluationId: "ev4", employeeId: "e9", acknowledgedAt: null, deemedAt: "2026-06-03T00:00:00.000Z" },
  ];
}

// ─── notifications ───────────────────────────────────────────────────────────
function seedNotifications(): Notification[] {
  return [
    // All employees get the pulse open notification
    { id: "n1", type: "NEW_PULSE", subject: "New pulse survey", body: "Q2 engagement pulse is open.", recipientEmployeeId: "e-emp", linkUrl: "/employee/surveys", isRead: false, createdAt: "2026-06-16T09:00:00.000Z" },
    // Evaluation ack reminder goes to the employee whose evaluation was shared
    { id: "n2", type: "NEW_EVALUATION", subject: "Evaluation shared", body: "Your H1 evaluation is ready to acknowledge.", recipientEmployeeId: "e-emp", linkUrl: "/employee/surveys", isRead: false, createdAt: "2026-06-15T14:30:00.000Z" },
    // Clearance sign-off goes to the supervisor (IT clearance owner = e-sup)
    { id: "n3", type: "CLEARANCE_SIGN_REQUEST", subject: "Clearance needs your sign-off", body: "M. Tan's IT clearance is awaiting you.", recipientEmployeeId: "e-sup", linkUrl: "/employee/clearance", isRead: false, createdAt: "2026-06-15T11:00:00.000Z" },
    // Onboarding status update goes to HR
    { id: "n4", type: "ONBOARDING_COMPLETE", subject: "Onboarding update", body: "H. Reyes reached document review.", recipientEmployeeId: "e-hr", linkUrl: "/hr/onboarding", isRead: true, createdAt: "2026-06-14T08:00:00.000Z" },
    // Pulse reminder goes to the employee (broadening: also relevant to supervisor)
    { id: "n5", type: "PULSE_REMINDER", subject: "Pulse reminder", body: "2 days left to submit the engagement pulse.", recipientEmployeeId: "e-sup", linkUrl: "/employee/surveys", isRead: true, createdAt: "2026-06-13T08:00:00.000Z" },
    // Admin (default login) — onboarding completion to review + the open pulse to answer
    { id: "n6", type: "ONBOARDING_COMPLETE", subject: "New hire in document review", body: "H. Reyes reached document review.", recipientEmployeeId: "e-admin", linkUrl: "/hr/onboarding", isRead: false, createdAt: "2026-06-16T10:00:00.000Z" },
    { id: "n7", type: "NEW_PULSE", subject: "New pulse survey", body: "Q2 engagement pulse is open.", recipientEmployeeId: "e-admin", linkUrl: "/employee/surveys", isRead: true, createdAt: "2026-06-16T09:00:00.000Z" },
  ];
}

export function buildSeed(): Record<string, unknown[]> {
  return {
    employees: seedEmployees(),
    users: seedUsers(),
    teams: seedTeams(),
    onboardingCases: seedOnboarding(),
    offboardingCases: seedOffboarding(),
    surveys: seedSurveys(),
    surveyResponses: seedSurveyResponses(),
    evaluations: seedEvaluations(),
    acknowledgements: seedAcknowledgements(),
    notifications: seedNotifications(),
  };
}
