import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import type { ScheduleDTO, CalendarSchedule } from "./types";
import type { ScheduleWriteInput } from "@packages/schemas";

// ── 월별 캘린더 조회 ─────────────────────────────────────────

export function useMonthlySchedules(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.schedules.monthly(year, month),
    queryFn: () =>
      api.get<{ items: CalendarSchedule[] }>("/schedules/month", { year, month }).then((r) => r.items),
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
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("일정"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("일정"));
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
      toast.success(SUCCESS_MESSAGES.UPDATE_SUCCESS("일정"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("일정"));
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
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("일정"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("일정"));
    },
  });
}
