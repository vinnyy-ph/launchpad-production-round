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
    detail: (id: string) => ["employees", "detail", id] as const,
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
  surveys: {
    all: ["surveys"] as const,
    list: (status?: string) =>
      status ? (["surveys", "list", status] as const) : (["surveys", "list"] as const),
    detail: (id: string) => ["surveys", "detail", id] as const,
    audienceOptions: ["surveys", "audience-options"] as const,
    // Aggregated results for a survey, optionally scoped by a team/supervisor filter.
    results: (id: string, filter?: Record<string, unknown>) =>
      filter
        ? (["surveys", "results", id, filter] as const)
        : (["surveys", "results", id] as const),
    // The signed-in employee's open pulses to answer.
    mine: ["surveys", "mine"] as const,
  },
} as const;
