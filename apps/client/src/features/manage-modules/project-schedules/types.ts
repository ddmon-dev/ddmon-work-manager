export interface ProjectScheduleLaneDTO {
  id: string;
  projectId: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectScheduleDTO {
  id: string;
  projectId: string;
  laneId: string;
  category: string;
  categoryColor: string | null;
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

export interface LaneWithSchedules extends ProjectScheduleLaneDTO {
  schedules: ProjectScheduleDTO[];
}

export interface OverviewProject {
  id: string;
  name: string;
  status: string;
  workPhase: string;
  description: string | null;
  contractDate: string;
  deliveredDate: string | null;
  completedDate: string | null;
  companyName: string;
  sortOrder: number;
  lanes: LaneWithSchedules[];
}

export interface OverviewResponse {
  items: OverviewProject[];
}
