import type { RecurrenceType } from "@packages/types";

export interface ScheduleDTO {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  color: string;
  sortOrder: number;
  recurrenceType: RecurrenceType;
  recurrenceEndDate: string | null;
  author: string;
  updatedBy: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
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
  recurrenceType: string;
  sourceId?: string;
  isOccurrence?: boolean;
}
