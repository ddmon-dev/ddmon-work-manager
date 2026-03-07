import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import type { ProjectScheduleWriteInput } from "@packages/schemas";
import type { ProjectScheduleDTO, ProjectScheduleListResponse, OverviewResponse } from "./types";

// ── 목록 조회 ────────────────────────────────────────────────

export function useProjectScheduleList(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectSchedules.list({ projectId }),
    queryFn: () =>
      api.get<ProjectScheduleListResponse>("/project-schedules", { projectId }),
  });
}

// ── 오버뷰 조회 ──────────────────────────────────────────────

export function useProjectScheduleOverview(status: string) {
  return useQuery({
    queryKey: queryKeys.projectSchedules.overview(status),
    queryFn: () =>
      api.get<OverviewResponse>("/project-schedules/overview", { status }),
  });
}

// ── 생성 ────────────────────────────────────────────────────

export function useCreateProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectScheduleWriteInput) =>
      api.post<ProjectScheduleDTO>("/project-schedules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("프로젝트 일정"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("프로젝트 일정"));
    },
  });
}

// ── 수정 ────────────────────────────────────────────────────

export function useUpdateProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectScheduleWriteInput> }) =>
      api.patch<ProjectScheduleDTO>(`/project-schedules/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectSchedules.all });
      const listQueries = queryClient.getQueriesData<ProjectScheduleListResponse>({
        queryKey: ["project-schedules", "list"],
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
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("프로젝트 일정"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
    },
  });
}

// ── 순서 변경 ─────────────────────────────────────────────────

export function useReorderProjectSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.put<{ updated: number }>("/project-schedules/reorder", { items }),
    onMutate: async (reorderedItems) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectSchedules.all });
      const orderMap = new Map(reorderedItems.map((item) => [item.id, item.sortOrder]));
      const listQueries = queryClient.getQueriesData<ProjectScheduleListResponse>({
        queryKey: ["project-schedules", "list"],
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
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("프로젝트 일정"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
    },
  });
}

// ── 삭제 ────────────────────────────────────────────────────

export function useDeleteProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/project-schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("프로젝트 일정"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("프로젝트 일정"));
    },
  });
}
