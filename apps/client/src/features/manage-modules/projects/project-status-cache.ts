import { type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { createProjectStatusQueue, type ProjectStatusPatch } from "./project-status-queue";
import type { ProjectDTO, ProjectListResponse, ProjectWithDetails } from "./types";

function createQueue(client: QueryClient) {
  return createProjectStatusQueue<ProjectDTO>({
    save: (id, patch) => api.patch<ProjectDTO>(`/projects/${id}/status`, patch),
    onChange: (id, patch) => {
      // 목록과 상세의 이전 응답이 최신 선택을 덮지 않게 취소한다.
      void client.cancelQueries({ queryKey: ["projects", "list"] });
      void client.cancelQueries({ queryKey: queryKeys.projects.detail(id) });
      client.setQueriesData<ProjectListResponse>({ queryKey: ["projects", "list"] }, (old) =>
        old ? { ...old, items: old.items.map((item) => item.id === id ? { ...item, ...patch } : item) } : old
      );
      client.setQueryData<ProjectWithDetails>(queryKeys.projects.detail(id), (old) =>
        old ? { ...old, ...patch } : old
      );
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "프로젝트 변경을 저장하지 못했습니다."),
    onIdle: () => {
      // 다른 행의 저장이 남아 있으면 전체 목록의 재조회도 기다린다.
      for (const queryKey of [
        queryKeys.projects.all,
        queryKeys.projectSchedules.overviews,
        queryKeys.dashboard.stats,
        queryKeys.dashboard.revenueSummary,
        queryKeys.revenue.all,
        queryKeys.settlement.all,
      ]) void client.invalidateQueries({ queryKey });
    },
  });
}

const queues = new WeakMap<QueryClient, ReturnType<typeof createQueue>>();

export function getProjectStatusQueue(client: QueryClient) {
  let queue = queues.get(client);
  if (!queue) {
    queue = createQueue(client);
    queues.set(client, queue);
  }
  return queue;
}

export function getCachedProjectStatus(client: QueryClient, id: string): ProjectStatusPatch {
  const candidates = [
    ...client.getQueriesData<ProjectListResponse>({ queryKey: ["projects", "list"] }).map(([key, data]) => ({
      item: data?.items.find((project) => project.id === id),
      updatedAt: client.getQueryState(key)?.dataUpdatedAt ?? 0,
    })),
    {
      item: client.getQueryData<ProjectWithDetails>(queryKeys.projects.detail(id)),
      updatedAt: client.getQueryState(queryKeys.projects.detail(id))?.dataUpdatedAt ?? 0,
    },
  ];
  const item = candidates.filter((candidate) => candidate.item)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.item;
  return item ? { status: item.status, workPhase: item.workPhase } : {};
}
