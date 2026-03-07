import type { TaskCategory } from "@packages/schemas";

export interface ProjectScheduleDTO {
  id: string;
  projectId: string;
  category: TaskCategory;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  sortOrder: number;
  author: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectScheduleListResponse {
  items: ProjectScheduleDTO[];
}

export interface OverviewProject {
  id: string;
  name: string;
  status: string;
  contractDate: string;
  deliveredDate: string | null;
  completedDate: string | null;
  companyName: string;
  schedules: ProjectScheduleDTO[];
}

export interface OverviewResponse {
  items: OverviewProject[];
}
