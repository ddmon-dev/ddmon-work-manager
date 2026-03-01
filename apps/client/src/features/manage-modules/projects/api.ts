import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { atLeast } from "@/shared/utils/delays";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
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
      atLeast(() =>
        api.get<ProjectListResponse>("/projects", {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
        })
      ),
  });
}

// ── fetchFn (ManageSheet용) ─────────────────────────────────

export const fetchProject = (id: string) =>
  api.get<ProjectWithDetails>(`/projects/${id}`);

// ── 프로젝트 연결 가능 견적서 목록 ───────────────────────────

export interface AvailableEstimate {
  estimateNumber: string;
  title: string;
  description: string | null;
  totalAmount: string;
  taxType: string;
  supplyAmount: number;
}

export function useAvailableEstimates(
  clientId: string | undefined,
  currentEstimateNumber?: string | null
) {
  return useQuery({
    queryKey: queryKeys.estimates.list({ type: "available", clientId, currentEstimateNumber }),
    queryFn: () =>
      api.get<AvailableEstimate[]>("/estimates/available", {
        clientId: clientId!,
        ...(currentEstimateNumber && { currentEstimateNumber }),
      }),
    enabled: !!clientId,
  });
}

// ── 견적서 → 프로젝트 자동 채움 ──────────────────────────────

export interface EstimateProjectInfo {
  clientId: string;
  title: string;
  description: string | null;
  totalAmount: string;
  taxType: string;
  supplyAmount: number;
}

export const fetchEstimateProjectInfo = (estimateNumber: string) =>
  api.get<EstimateProjectInfo>(`/estimates/series/${estimateNumber}/project-info`);

// ── 생성 ────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectWriteInput) =>
      api.post<ProjectDTO>("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("프로젝트"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("프로젝트"));
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
      toast.success(SUCCESS_MESSAGES.UPDATE_SUCCESS("프로젝트"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("프로젝트"));
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
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("프로젝트"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("프로젝트"));
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
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("프로젝트"));
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
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("입금 내역"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("입금 내역"));
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
      toast.success(SUCCESS_MESSAGES.UPDATE_SUCCESS("입금 내역"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("입금 내역"));
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
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("입금 내역"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("입금 내역"));
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
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("메모"));
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
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("메모"));
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
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("메모"));
    },
  });
}
