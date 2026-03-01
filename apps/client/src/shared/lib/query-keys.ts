type Params = Record<string, unknown>;

export const queryKeys = {
  clients: {
    all: ["clients"] as const,
    list: (params: Params) => ["clients", "list", params] as const,
    detail: (id: string) => ["clients", "detail", id] as const,
  },
  estimates: {
    all: ["estimates"] as const,
    list: (params: Params) => ["estimates", "list", params] as const,
    detail: (id: string) => ["estimates", "detail", id] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (params: Params) => ["projects", "list", params] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
  },
  schedules: {
    all: ["schedules"] as const,
    list: (params: Params) => ["schedules", "list", params] as const,
    detail: (id: string) => ["schedules", "detail", id] as const,
    monthly: (year: number, month: number) =>
      ["schedules", "monthly", year, month] as const,
  },
  todos: {
    all: ["todos"] as const,
    list: (params: Params) => ["todos", "list", params] as const,
    detail: (id: string) => ["todos", "detail", id] as const,
    byDate: (date: string) => ["todos", "by-date", date] as const,
  },
  admins: {
    all: ["admins"] as const,
    list: (params: Params) => ["admins", "list", params] as const,
    detail: (id: string) => ["admins", "detail", id] as const,
  },
  dashboard: {
    stats: ["dashboard", "stats"] as const,
    revenueSummary: ["dashboard", "revenue-summary"] as const,
    schedules: ["dashboard", "schedules"] as const,
  },
  revenue: {
    all: ["revenue"] as const,
    byYear: (year: number) => ["revenue", year] as const,
  },
  businessInfo: {
    single: ["business-info"] as const,
  },
};
