import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import { createMemoHooks } from "../_base/hooks/use-memo-mutations";
import type {
  ProjectDTO,
  ProjectWithDetails,
  ProjectListResponse,
  PaymentDTO,
  ProjectStatus,
  WorkPhase,
} from "./types";
import type { ProjectWriteInput } from "@packages/schemas";

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
    placeholderData: keepPreviousData,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.overviews });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.overviews });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.all });
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
    onMutate: async ({ id, status, workPhase }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(id) });
      const previousDetail = queryClient.getQueryData<ProjectWithDetails>(queryKeys.projects.detail(id));
      const previousLists = queryClient.getQueriesData<ProjectListResponse>({ queryKey: ["projects", "list"] });

      queryClient.setQueryData<ProjectWithDetails>(queryKeys.projects.detail(id), (old) =>
        old
          ? { ...old, status: status ?? old.status, workPhase: workPhase ?? old.workPhase }
          : old
      );
      queryClient.setQueriesData<ProjectListResponse>({ queryKey: ["projects", "list"] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((item) =>
                item.id === id
                  ? { ...item, status: status ?? item.status, workPhase: workPhase ?? item.workPhase }
                  : item
              ),
            }
          : old
      );

      return { previousDetail, previousLists };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.projects.detail(id), context.previousDetail);
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      toast.error(CRUD_ERRORS.UPDATE_FAILED("프로젝트"));
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectSchedules.overviews });
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
    onMutate: async ({ projectId, description, amount, paidDate }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });
      const previous = queryClient.getQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId));
      queryClient.setQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId), (old) =>
        old
          ? {
              ...old,
              payments: [
                ...old.payments,
                {
                  id: crypto.randomUUID(),
                  projectId,
                  description,
                  amount: String(amount),
                  paidDate,
                  deleted: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            }
          : old
      );
      return { previous };
    },
    onError: (_err, { projectId }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previous);
      toast.error(CRUD_ERRORS.CREATE_FAILED("입금 내역"));
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
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
    onMutate: async ({ projectId, paymentId, description, amount, paidDate }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });
      const previous = queryClient.getQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId));
      queryClient.setQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId), (old) =>
        old
          ? {
              ...old,
              payments: old.payments.map((p) =>
                p.id === paymentId
                  ? { ...p, description, amount: String(amount), paidDate }
                  : p
              ),
            }
          : old
      );
      return { previous };
    },
    onError: (_err, { projectId }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previous);
      toast.error(CRUD_ERRORS.UPDATE_FAILED("입금 내역"));
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, paymentId }: { projectId: string; paymentId: string }) =>
      api.delete<{ id: string }>(`/projects/payments/${paymentId}`),
    onMutate: async ({ projectId, paymentId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });
      const previous = queryClient.getQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId));
      queryClient.setQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId), (old) =>
        old
          ? { ...old, payments: old.payments.filter((p) => p.id !== paymentId) }
          : old
      );
      return { previous };
    },
    onError: (_err, { projectId }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previous);
      toast.error(CRUD_ERRORS.DELETE_FAILED("입금 내역"));
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

// ── 메모 ────────────────────────────────────────────────────

const {
  useCreateMemo: useCreateProjectMemo,
  useUpdateMemo: useUpdateProjectMemo,
  useDeleteMemo: useDeleteProjectMemo,
} = createMemoHooks<ProjectWithDetails>({
  basePath: "/projects",
  detailQueryKey: (parentId) => queryKeys.projects.detail(parentId),
});

export { useCreateProjectMemo, useUpdateProjectMemo, useDeleteProjectMemo };
