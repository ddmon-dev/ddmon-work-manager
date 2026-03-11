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
  projectSchedules: {
    all: ["project-schedules"] as const,
    lists: ["project-schedules", "list"] as const,
    list: (params: Params) => ["project-schedules", "list", params] as const,
    detail: (id: string) => ["project-schedules", "detail", id] as const,
    overviews: ["project-schedules", "overview"] as const,
    overview: (status: string) => ["project-schedules", "overview", status] as const,
    lanes: (params: Params) => ["project-schedules", "lanes", params] as const,
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
  mindnotes: {
    all: ["mindnotes"] as const,
    random: ["mindnotes", "random"] as const,
  },
  libraryBoards: {
    all: ["library-boards"] as const,
    list: () => ["library-boards", "list"] as const,
  },
  libraryDocuments: {
    all: ["library-documents"] as const,
    list: (boardId: string) => ["library-documents", "list", boardId] as const,
    detail: (id: string) => ["library-documents", "detail", id] as const,
  },
  files: {
    all: ["files"] as const,
    list: (params: Params) => ["files", "list", params] as const,
    path: (id: string) => ["files", "path", id] as const,
  },
  trash: {
    all: ["trash"] as const,
    list: () => ["trash", "list"] as const,
  },
};
