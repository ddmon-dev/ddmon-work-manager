import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
  ProjectDTO,
  ProjectWithDetails,
  ProjectListResponse,
  PaymentDTO,
  ProjectStatus,
  WorkPhase,
} from "./types";
import type { ProjectWriteInput } from "@work-manager/schemas";

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

// ── 목록 조회 ────────────────────────────────────────────────

export function useProjectList(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () =>
      api.get<ProjectListResponse>("/projects", {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      }),
  });
}

// ── fetchFn (ManageSheet용) ─────────────────────────────────

export const fetchProject = (id: string) =>
  api.get<ProjectWithDetails>(`/projects/${id}`);

// ── 생성 ────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectWriteInput) =>
      api.post<ProjectDTO>("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success("프로젝트가 생성되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "생성에 실패했습니다.");
    },
  });
}

// ── 수정 ────────────────────────────────────────────────────

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectWriteInput> }) =>
      api.patch<ProjectDTO>(`/projects/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
      toast.success("프로젝트가 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "수정에 실패했습니다.");
    },
  });
}

// ── 삭제 ────────────────────────────────────────────────────

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success("프로젝트가 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "삭제에 실패했습니다.");
    },
  });
}

// ── 상태/단계 변경 ────────────────────────────────────────────

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      workPhase,
    }: {
      id: string;
      status?: ProjectStatus;
      workPhase?: WorkPhase;
    }) =>
      api.patch<ProjectDTO>(`/projects/${id}/status`, { status, workPhase }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "상태 변경에 실패했습니다.");
    },
  });
}

// ── 수금 ────────────────────────────────────────────────────

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      ...data
    }: {
      projectId: string;
      description: string;
      amount: number;
      paidDate: string;
    }) => api.post<PaymentDTO>(`/projects/${projectId}/payments`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success("수금이 등록되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "수금 등록에 실패했습니다.");
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      paymentId,
      ...data
    }: {
      projectId: string;
      paymentId: string;
      description: string;
      amount: number;
      paidDate: string;
    }) => api.patch<PaymentDTO>(`/projects/payments/${paymentId}`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success("수금이 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "수금 수정에 실패했습니다.");
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, paymentId }: { projectId: string; paymentId: string }) =>
      api.delete<{ id: string }>(`/projects/payments/${paymentId}`),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success("수금이 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "수금 삭제에 실패했습니다.");
    },
  });
}

// ── 메모 ────────────────────────────────────────────────────

export function useCreateProjectMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, content }: { projectId: string; content: string }) =>
      api.post(`/projects/${projectId}/memos`, { content }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "메모 생성에 실패했습니다.");
    },
  });
}

export function useUpdateProjectMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      memoId,
      content,
    }: {
      projectId: string;
      memoId: string;
      content: string;
    }) => api.patch(`/projects/memos/${memoId}`, { content }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "메모 수정에 실패했습니다.");
    },
  });
}

export function useDeleteProjectMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, memoId }: { projectId: string; memoId: string }) =>
      api.delete(`/projects/memos/${memoId}`),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "메모 삭제에 실패했습니다.");
    },
  });
}
