import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";

export interface DashboardStats {
  pendingEstimateCount: number;
  pendingProjectCount: number;
  activeProjectCount: number;
  settlingProjectCount: number;
}

export interface RevenueSummaryData {
  currentYear: number;
  contractTotal: number;
  paymentTotal: number;
  collectionRate: number;
  cumulativeOutstanding: number;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  color: string;
  clientName: string | null;
  projectName: string | null;
}

export interface ScheduleData {
  today: ScheduleItem[];
  thisWeek: ScheduleItem[];
  upcoming: ScheduleItem[];
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => api.get<DashboardStats>("/dashboard/stats"),
  });
}

export function useRevenueSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.revenueSummary,
    queryFn: () => api.get<RevenueSummaryData>("/dashboard/revenue-summary"),
  });
}

export function useUpcomingSchedules() {
  return useQuery({
    queryKey: queryKeys.dashboard.schedules,
    queryFn: () => api.get<ScheduleData>("/dashboard/schedules"),
  });
}
