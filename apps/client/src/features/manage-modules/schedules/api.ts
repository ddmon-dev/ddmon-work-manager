import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { ScheduleDTO, ScheduleListResponse, CalendarSchedule } from "./types";
import type { ScheduleWriteInput } from "@work-manager/schemas";

type ClientOption = { value: string; label: string };
type ProjectOption = { value: string; label: string; clientId: string };

// ── 선택 옵션 (폼용) ─────────────────────────────────────────

export function useClientOptions() {
  return useQuery({
    queryKey: ["clients", "options"] as const,
    queryFn: () =>
      api.get<{ items: { id: string; companyName: string }[] }>("/clients", {
        pageSize: 999,
      }),
    select: (data): ClientOption[] =>
      data.items.map((c) => ({ value: c.id, label: c.companyName })),
    staleTime: 30_000,
  });
}

export function useProjectOptions() {
  return useQuery({
    queryKey: ["projects", "options"] as const,
    queryFn: () =>
      api.get<{ items: { id: string; name: string; clientId: string }[] }>(
        "/projects",
        { pageSize: 999 }
      ),
    select: (data): ProjectOption[] =>
      data.items.map((p) => ({
        value: p.id,
        label: p.name,
        clientId: p.clientId,
      })),
    staleTime: 30_000,
  });
}

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

// ── 월별 캘린더 조회 ─────────────────────────────────────────

export function useMonthlySchedules(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.schedules.monthly(year, month),
    queryFn: () =>
      api.get<CalendarSchedule[]>("/schedules/month", { year, month }),
  });
}

// ── 목록 조회 ────────────────────────────────────────────────

export function useScheduleList(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.schedules.list(params),
    queryFn: () =>
      api.get<ScheduleListResponse>("/schedules", {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      }),
  });
}

// ── fetchFn (ManageSheet용) ─────────────────────────────────

export const fetchSchedule = (id: string) =>
  api.get<ScheduleDTO>(`/schedules/${id}`);

// ── 생성 ────────────────────────────────────────────────────

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ScheduleWriteInput) =>
      api.post<ScheduleDTO>("/schedules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
      toast.success("일정이 생성되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "생성에 실패했습니다.");
    },
  });
}

// ── 수정 ────────────────────────────────────────────────────

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScheduleWriteInput> }) =>
      api.patch<ScheduleDTO>(`/schedules/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.detail(id) });
      toast.success("일정이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "수정에 실패했습니다.");
    },
  });
}

// ── 삭제 ────────────────────────────────────────────────────

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
      toast.success("일정이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "삭제에 실패했습니다.");
    },
  });
}
