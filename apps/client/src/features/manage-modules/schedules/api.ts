import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import type { ScheduleDTO, ScheduleListResponse, CalendarSchedule } from "./types";
import type { ScheduleWriteInput } from "@packages/schemas";

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
      api.get<{ items: CalendarSchedule[] }>("/schedules/month", { year, month }).then((r) => r.items),
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
    placeholderData: keepPreviousData,
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.schedules.all });
      const listQueries = queryClient.getQueriesData<ScheduleListResponse>({
        queryKey: ["schedules", "list"],
      });
      for (const [key, old] of listQueries) {
        if (!old) continue;
        queryClient.setQueryData(key, {
          ...old,
          items: old.items.map((item) =>
            item.id === id ? { ...item, ...data } : item
          ),
        });
      }
      return { listQueries };
    },
    onError: (error, _, ctx) => {
      if (ctx?.listQueries) {
        for (const [key, old] of ctx.listQueries) {
          queryClient.setQueryData(key, old);
        }
      }
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("일정"));
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.detail(id) });
    },
  });
}

// ── 순서 변경 ─────────────────────────────────────────────────

export function useReorderSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.put<{ updated: number }>("/schedules/reorder", { items }),
    onMutate: async (reorderedItems) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.schedules.all });
      const orderMap = new Map(reorderedItems.map((item) => [item.id, item.sortOrder]));
      const listQueries = queryClient.getQueriesData<ScheduleListResponse>({
        queryKey: ["schedules", "list"],
      });
      for (const [key, old] of listQueries) {
        if (!old) continue;
        const updated = old.items
          .map((item) => ({
            ...item,
            sortOrder: orderMap.get(item.id) ?? item.sortOrder,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        queryClient.setQueryData(key, { ...old, items: updated });
      }
      return { listQueries };
    },
    onError: (error, _, ctx) => {
      if (ctx?.listQueries) {
        for (const [key, old] of ctx.listQueries) {
          queryClient.setQueryData(key, old);
        }
      }
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("일정"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
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
