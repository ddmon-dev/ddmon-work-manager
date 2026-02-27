export interface ScheduleDTO {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  color: string;
  location: string | null;
  clientId: string | null;
  projectId: string | null;
  recurrenceType: "none" | "daily" | "weekly" | "monthly";
  recurrenceEndDate: string | null;
  author: string;
  updatedBy: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleListResponse {
  items: ScheduleDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CalendarSchedule {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  color: string;
  location: string | null;
  clientId: string | null;
  clientName?: string;
  projectId: string | null;
  projectName?: string;
  recurrenceType: string;
  sourceId?: string;
  isOccurrence?: boolean;
}
