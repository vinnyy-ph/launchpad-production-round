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
  users: { all: ["users"] as const },
  evaluations: {
    all: ["evaluations"] as const,
    list: (status?: string) =>
      status ? (["evaluations", "list", status] as const) : (["evaluations", "list"] as const),
    reviewees: ["evaluations", "reviewees"] as const,
  },
  surveys: {
    all: ["surveys"] as const,
    list: () => ["surveys", "list"] as const,
  },
} as const;
