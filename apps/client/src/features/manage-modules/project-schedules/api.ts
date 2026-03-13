import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import type { ProjectScheduleWriteInput } from "@packages/schemas";
import type {
  ProjectScheduleDTO,
  ProjectScheduleListResponse,
  ProjectScheduleLaneDTO,
  LaneWithSchedules,
  OverviewResponse,
} from "./types";

// ── 캐시 업데이트 헬퍼 ──────────────────────────────────────────

function updateListCache(
  queryClient: QueryClient,
  updater: (items: ProjectScheduleDTO[]) => ProjectScheduleDTO[],
) {
  const listQueries = queryClient.getQueriesData<ProjectScheduleListResponse>({
    queryKey: queryKeys.projectSchedules.lists,
  });
  for (const [key, old] of listQueries) {
    if (!old) continue;
    queryClient.setQueryData(key, { ...old, items: updater(old.items) });
  }
  return listQueries;
}

function updateOverviewCache(
  queryClient: QueryClient,
  updater: (lanes: LaneWithSchedules[]) => LaneWithSchedules[],
  projectId?: string,
) {
  const overviewQueries = queryClient.getQueriesData<OverviewResponse>({
    queryKey: queryKeys.projectSchedules.overviews,
  });
  for (const [key, old] of overviewQueries) {
    if (!old) continue;
    queryClient.setQueryData(key, {
      ...old,
      items: old.items.map((project) =>
        projectId && project.id !== projectId
          ? project
          : { ...project, lanes: updater(project.lanes) }
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

// ── 오버뷰 조회 ──────────────────────────────────────────────

export function useProjectScheduleOverview(status: string) {
  return useQuery({
    queryKey: queryKeys.projectSchedules.overview(status),
    queryFn: () =>
      api.get<OverviewResponse>("/project-schedules/overview", { status }),
  });
}

// ── 목록 조회 ────────────────────────────────────────────────

export function useProjectScheduleList(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectSchedules.list({ projectId }),
    queryFn: () =>
      api.get<ProjectScheduleListResponse>("/project-schedules", { projectId }),
  });
}

// ── 레인 CRUD ────────────────────────────────────────────────

export function useLaneList(projectId: string) {
  return useQuery({
    queryKey: queryKeys.projectSchedules.lanes({ projectId }),
    queryFn: () =>
      api.get<{ items: ProjectScheduleLaneDTO[] }>("/project-schedules/lanes", { projectId }),
  });
}

export function useCreateLane() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { projectId: string; title?: string; sortOrder?: number }) =>
      api.post<ProjectScheduleLaneDTO>("/project-schedules/lanes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
    },
    onError: (error) => {
      toast.error(error.message || "행 생성에 실패했습니다.");
    },
  });
}

export function useUpdateLane() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; sortOrder?: number } }) =>
      api.patch<ProjectScheduleLaneDTO>(`/project-schedules/lanes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
    },
    onError: (error) => {
      toast.error(error.message || "행 수정에 실패했습니다.");
    },
  });
}

export function useDeleteLane() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/project-schedules/lanes/${id}`),
    onSuccess: () => {
      toast.success("행이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
    },
    onError: (error) => {
      toast.error(error.message || "행 삭제에 실패했습니다.");
    },
  });
}

export function useReorderLanes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.put<{ updated: number }>("/project-schedules/lanes/reorder", { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
    },
    onError: (error) => {
      toast.error(error.message || "행 순서 변경에 실패했습니다.");
    },
  });
}

// ── 일정 생성 ────────────────────────────────────────────────

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
        laneId: data.laneId,
        category: data.category ?? "development",
        categoryColor: data.categoryColor ?? null,
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

      const listQueries = updateListCache(queryClient, (items) =>
        [...items, tempItem].sort((a, b) => a.sortOrder - b.sortOrder)
      );

      const overviewQueries = updateOverviewCache(
        queryClient,
        (lanes) => lanes.map((lane) =>
          lane.id === data.laneId
            ? { ...lane, schedules: [...lane.schedules, tempItem].sort((a, b) => a.sortOrder - b.sortOrder) }
            : lane
        ),
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

// ── 일정 수정 ────────────────────────────────────────────────

export function useUpdateProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectScheduleWriteInput> }) =>
      api.patch<ProjectScheduleDTO>(`/project-schedules/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectSchedules.all });

      const listQueries = updateListCache(queryClient, (items) =>
        items.map((item) => item.id === id ? { ...item, ...data } : item)
      );

      const overviewQueries = updateOverviewCache(
        queryClient,
        (lanes) => {
          // laneId가 변경되면 레인 간 이동
          if (data.laneId) {
            const schedule = lanes.flatMap((l) => l.schedules).find((s) => s.id === id);
            if (schedule) {
              return lanes.map((lane) => ({
                ...lane,
                schedules: lane.id === data.laneId
                  ? [...lane.schedules.filter((s) => s.id !== id), { ...schedule, ...data }]
                  : lane.schedules.filter((s) => s.id !== id),
              }));
            }
          }
          return lanes.map((lane) => ({
            ...lane,
            schedules: lane.schedules.map((s) => s.id === id ? { ...s, ...data } : s),
          }));
        },
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

// ── 일정 순서 변경 ─────────────────────────────────────────────

export function useReorderProjectSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.put<{ updated: number }>("/project-schedules/reorder", { items }),
    onError: (error) => {
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
    onError: (error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("프로젝트 순서"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.overviews });
    },
  });
}

// ── 일정 삭제 ────────────────────────────────────────────────

export function useDeleteProjectSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/project-schedules/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectSchedules.all });

      const listQueries = updateListCache(queryClient, (items) =>
        items.filter((item) => item.id !== id)
      );

      const overviewQueries = updateOverviewCache(
        queryClient,
        (lanes) => lanes.map((lane) => ({
          ...lane,
          schedules: lane.schedules.filter((s) => s.id !== id),
        })),
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
