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
  billedTotal: number;
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

export interface RandomMindnote {
  id: string;
  content: string;
  createdAt: string;
}

export function useRandomMindnote() {
  return useQuery({
    queryKey: queryKeys.mindnotes.random,
    queryFn: () => api.get<{ mindnote: RandomMindnote | null }>("/mindnotes/random"),
    staleTime: Infinity,
    refetchOnMount: "always",
  });
}
