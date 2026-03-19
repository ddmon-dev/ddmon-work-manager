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
  category?: string;
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
        category: params.category,
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
      paymentType: "deposit" | "interim" | "balance" | "additional";
    }) => api.post<PaymentDTO>(`/projects/${projectId}/payments`, data),
    onMutate: async ({ projectId, description, amount, paidDate, paymentType }) => {
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
                  paymentType,
                  invoiceIssued: false,
                  invoiceDate: null,
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
      description?: string;
      amount?: number;
      paidDate?: string;
      paymentType?: string;
      invoiceIssued?: boolean;
      invoiceDate?: string | null;
    }) => api.patch<PaymentDTO>(`/projects/payments/${paymentId}`, data),
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("입금 내역"));
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

// ── 지출 ────────────────────────────────────────────────────

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      ...data
    }: {
      projectId: string;
      description: string;
      amount: number;
      expenseDate: string;
    }) => api.post(`/projects/${projectId}/expenses`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("지출"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("지출"));
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      expenseId,
      ...data
    }: {
      projectId: string;
      expenseId: string;
      description?: string;
      amount?: number;
      expenseDate?: string;
    }) => api.patch(`/projects/expenses/${expenseId}`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("지출"));
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, expenseId }: { projectId: string; expenseId: string }) =>
      api.delete(`/projects/expenses/${expenseId}`),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("지출"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("지출"));
    },
  });
}

// ── 파트너 지급 ────────────────────────────────────────────────

export function useCreatePartnerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      ...data
    }: {
      projectId: string;
      partnerId: string;
      description: string;
      amount: number;
      paidDate: string;
    }) => api.post(`/projects/${projectId}/partner-payments`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("파트너 지급"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("파트너 지급"));
    },
  });
}

export function useUpdatePartnerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      partnerPaymentId,
      ...data
    }: {
      projectId: string;
      partnerPaymentId: string;
      description?: string;
      amount?: number;
      paidDate?: string;
      withholdingReported?: boolean;
      withholdingReportedDate?: string | null;
    }) => api.patch(`/projects/partner-payments/${partnerPaymentId}`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("파트너 지급"));
    },
  });
}

export function useDeletePartnerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, partnerPaymentId }: { projectId: string; partnerPaymentId: string }) =>
      api.delete(`/projects/partner-payments/${partnerPaymentId}`),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("파트너 지급"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("파트너 지급"));
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

// ── 파트너 배치 ────────────────────────────────────────────────

export function useAddProjectPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      ...data
    }: {
      projectId: string;
      partnerId: string;
      roles?: string[];
      amount?: number | null;
      taxType?: string;
      notes?: string;
    }) => api.post(`/projects/${projectId}/partners`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      toast.success("파트너가 배치되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "파트너 배치에 실패했습니다.");
    },
  });
}

export function useUpdateProjectPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      assignmentId,
      ...data
    }: {
      projectId: string;
      assignmentId: string;
      roles?: string[];
      amount?: number | null;
      taxType?: string;
      notes?: string;
    }) => api.patch(`/projects/partners/${assignmentId}`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "파트너 배치 수정에 실패했습니다.");
    },
  });
}

export function useRemoveProjectPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      assignmentId,
    }: {
      projectId: string;
      assignmentId: string;
    }) => api.delete(`/projects/partners/${assignmentId}`),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      toast.success("파트너 배치가 해제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "파트너 배치 해제에 실패했습니다.");
    },
  });
}
