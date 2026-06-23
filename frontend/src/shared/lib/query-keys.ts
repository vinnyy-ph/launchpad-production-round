// Centralised TanStack Query keys. Import from here so query and invalidation
// targets stay in sync as each domain's hooks are built. Add domains as screens land.
export const queryKeys = {
  dashboard: { all: ["dashboard"] as const },
  notifications: {
    all: ["notifications"] as const,
    list: (employeeId: string, limit: number) => ["notifications", employeeId, limit] as const,
  },
  employees: {
    all: ["employees"] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? (["employees", "list", filters] as const) : (["employees", "list"] as const),
    // The whole directory, non-paginated (org chart).
    allList: ["employees", "all"] as const,
    detail: (id: string) => ["employees", "detail", id] as const,
  },
  departments: {
    all: ["departments"] as const,
    list: ["departments", "list"] as const,
    table: (filters?: Record<string, unknown>) =>
      filters
        ? (["departments", "table", filters] as const)
        : (["departments", "table"] as const),
  },
  teams: {
    all: ["teams"] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? (["teams", "list", filters] as const) : (["teams", "list"] as const),
  },
  users: {
    all: ["users"] as const,
    list: (filters?: Record<string, unknown>) =>
      filters ? (["users", "list", filters] as const) : (["users", "list"] as const),
  },
  evaluations: {
    all: ["evaluations"] as const,
    list: (status?: string) =>
      status ? (["evaluations", "list", status] as const) : (["evaluations", "list"] as const),
    reviewees: ["evaluations", "reviewees"] as const,
  },
  onboarding: {
    all: ["onboarding"] as const,
    // HR list of onboarding employees (employees filtered by status=onboarding).
    records: (filters?: Record<string, unknown>) =>
      filters ? (["onboarding", "records", filters] as const) : (["onboarding", "records"] as const),
    // HR document submissions to review, optionally scoped by status.
    reviews: (status?: string) =>
      status ? (["onboarding", "reviews", status] as const) : (["onboarding", "reviews"] as const),
    documentConfigs: ["onboarding", "document-configs"] as const,
    customFieldConfigs: ["onboarding", "custom-field-configs"] as const,
    // One new hire's onboarding checklist (answers + submissions) for HR/Admin.
    status: (employeeId: string) => ["onboarding", "status", employeeId] as const,
    // The signed-in employee's own onboarding checklist.
    mine: ["onboarding", "mine"] as const,
    invitations: (recordId: string) => ["onboarding", "invitations", recordId] as const,
  },
  offboarding: {
    all: ["offboarding"] as const,
    // HR (all) / supervisor (downward chain) list of offboarding cases.
    list: ["offboarding", "list"] as const,
    // One offboarding case detail.
    detail: (id: string) => ["offboarding", "detail", id] as const,
    // The signed-in employee's own offboarding case.
    mine: ["offboarding", "mine"] as const,
  },
  clearance: {
    all: ["clearance"] as const,
    // Clearance requests assigned to the signed-in signatory.
    assigned: ["clearance", "assigned"] as const,
    // Lightweight clearance version options for the offboarding initiate picker.
    templateOptions: ["clearance", "template-options"] as const,
    // HR-managed clearance versions (templates) with their signatories.
    templates: ["clearance", "templates"] as const,
  },
  supervisorOnboarding: {
    // The onboarding side of a supervisor's downward chain (read-only consume).
    status: ["supervisor-onboarding", "status"] as const,
  },
  surveys: {
    all: ["surveys"] as const,
    list: (status?: string) =>
      status ? (["surveys", "list", status] as const) : (["surveys", "list"] as const),
    detail: (id: string) => ["surveys", "detail", id] as const,
    audienceOptions: ["surveys", "audience-options"] as const,
    // Aggregated results for a survey round, optionally scoped by a team/supervisor filter.
    // occurrenceId distinguishes the chosen round; "latest" is the default (server picks it).
    results: (id: string, filter?: Record<string, unknown>, occurrenceId?: string) =>
      filter
        ? (["surveys", "results", id, occurrenceId ?? "latest", filter] as const)
        : (["surveys", "results", id, occurrenceId ?? "latest"] as const),
    // All rounds of a recurring survey (round picker on the results page).
    occurrences: (id: string) => ["surveys", "occurrences", id] as const,
    // The signed-in employee's open pulses to answer.
    mine: ["surveys", "mine"] as const,
    // The signed-in employee's already-answered pulses (history).
    mineAnswered: ["surveys", "mine", "answered"] as const,
    // The signed-in employee's own answers for one completed occurrence.
    mineAnswers: (occurrenceId: string) =>
      ["surveys", "mine", "answered", occurrenceId] as const,
    // Authorized drill-down name list for one occurrence (named surveys).
    respondents: (occurrenceId: string) =>
      ["surveys", "respondents", occurrenceId] as const,
    // One named respondent's answers for one occurrence.
    respondentAnswers: (occurrenceId: string, employeeId: string) =>
      ["surveys", "respondents", occurrenceId, employeeId] as const,
    // Surveys whose results the signed-in user may view.
    viewableResults: ["surveys", "viewable-results"] as const,
    // AI insight summary for a survey's open-text responses.
    insights: (id: string) => ["surveys", "insights", id] as const,
  },
} as const;
