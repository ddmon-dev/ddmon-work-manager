import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import type { ProjectScheduleWriteInput } from "@packages/schemas";
import type { ProjectScheduleDTO, ProjectScheduleListResponse, OverviewResponse } from "./types";

// ── 오버뷰 캐시 업데이트 헬퍼 ─────────────────────────────────────

function updateOverviewCache(
  queryClient: QueryClient,
  updater: (schedules: ProjectScheduleDTO[]) => ProjectScheduleDTO[],
  projectId?: string,
) {
  const overviewQueries = queryClient.getQueriesData<OverviewResponse>({
    queryKey: ["project-schedules", "overview"],
  });
  for (const [key, old] of overviewQueries) {
    if (!old) continue;
    queryClient.setQueryData(key, {
      ...old,
      items: old.items.map((project) =>
        projectId && project.id !== projectId
          ? project
          : { ...project, schedules: updater(project.schedules) }
      ),
    });
  }
  return overviewQueries;
}

function rollbackQueries<T>(queries: [readonly unknown[], T | undefined][], queryClient: QueryClient) {
  for (const [key, old] of queries) {
    queryClient.setQueryData(key, old);
  }
}

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
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectSchedules.all });

      const tempItem: ProjectScheduleDTO = {
        id: crypto.randomUUID(),
        projectId: data.projectId,
        category: data.category ?? "development",
        title: data.title,
        description: data.description ?? null,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        sortOrder: data.sortOrder ?? 0,
        author: null,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const listQueries = queryClient.getQueriesData<ProjectScheduleListResponse>({
        queryKey: ["project-schedules", "list"],
      });
      for (const [key, old] of listQueries) {
        if (!old) continue;
        queryClient.setQueryData(key, {
          ...old,
          items: [...old.items, tempItem].sort((a, b) => a.sortOrder - b.sortOrder),
        });
      }

      const overviewQueries = updateOverviewCache(
        queryClient,
        (schedules) => [...schedules, tempItem].sort((a, b) => a.sortOrder - b.sortOrder),
        data.projectId,
      );

      return { listQueries, overviewQueries };
    },
    onSuccess: () => {
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("프로젝트 일정"));
    },
    onError: (error, _, ctx) => {
      if (ctx?.listQueries) rollbackQueries(ctx.listQueries, queryClient);
      if (ctx?.overviewQueries) rollbackQueries(ctx.overviewQueries, queryClient);
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("프로젝트 일정"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
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

      const overviewQueries = updateOverviewCache(
        queryClient,
        (schedules) => schedules.map((s) => s.id === id ? { ...s, ...data } : s),
      );

      return { listQueries, overviewQueries };
    },
    onError: (error, _, ctx) => {
      if (ctx?.listQueries) rollbackQueries(ctx.listQueries, queryClient);
      if (ctx?.overviewQueries) rollbackQueries(ctx.overviewQueries, queryClient);
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

      const overviewQueries = updateOverviewCache(
        queryClient,
        (schedules) => schedules
          .map((s) => ({ ...s, sortOrder: orderMap.get(s.id) ?? s.sortOrder }))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );

      return { listQueries, overviewQueries };
    },
    onError: (error, _, ctx) => {
      if (ctx?.listQueries) rollbackQueries(ctx.listQueries, queryClient);
      if (ctx?.overviewQueries) rollbackQueries(ctx.overviewQueries, queryClient);
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("프로젝트 일정"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
    },
  });
}

// ── 프로젝트 순서 변경 ───────────────────────────────────────────

export function useReorderProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.put<{ updated: number }>("/projects/reorder", { items }),
    onMutate: async (reorderedItems) => {
      await queryClient.cancelQueries({ queryKey: ["project-schedules", "overview"] });
      const orderMap = new Map(reorderedItems.map((item) => [item.id, item.sortOrder]));

      const overviewQueries = queryClient.getQueriesData<OverviewResponse>({
        queryKey: ["project-schedules", "overview"],
      });
      for (const [key, old] of overviewQueries) {
        if (!old) continue;
        queryClient.setQueryData(key, {
          ...old,
          items: [...old.items]
            .map((p) => ({ ...p, sortOrder: orderMap.get(p.id) ?? p.sortOrder }))
            .sort((a, b) => a.sortOrder - b.sortOrder),
        });
      }

      return { overviewQueries };
    },
    onError: (error, _, ctx) => {
      if (ctx?.overviewQueries) rollbackQueries(ctx.overviewQueries, queryClient);
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("프로젝트 순서"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project-schedules", "overview"] });
    },
  });
}

// ── 삭제 ────────────────────────────────────────────────────

export function useDeleteProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/project-schedules/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectSchedules.all });

      const listQueries = queryClient.getQueriesData<ProjectScheduleListResponse>({
        queryKey: ["project-schedules", "list"],
      });
      for (const [key, old] of listQueries) {
        if (!old) continue;
        queryClient.setQueryData(key, {
          ...old,
          items: old.items.filter((item) => item.id !== id),
        });
      }

      const overviewQueries = updateOverviewCache(
        queryClient,
        (schedules) => schedules.filter((s) => s.id !== id),
      );

      return { listQueries, overviewQueries };
    },
    onSuccess: () => {
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("프로젝트 일정"));
    },
    onError: (error, _, ctx) => {
      if (ctx?.listQueries) rollbackQueries(ctx.listQueries, queryClient);
      if (ctx?.overviewQueries) rollbackQueries(ctx.overviewQueries, queryClient);
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("프로젝트 일정"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
    },
  });
}
