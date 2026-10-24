import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import { queryClient } from "@/shared/lib/query-client";
import { getProjectStatusQueue, getCachedProjectStatus } from "./project-status-cache";
import { createMemoHooks } from "../_base/hooks/use-memo-mutations";
import type {
  ProjectDTO,
  ProjectWithDetails,
  ProjectListResponse,
  CollectionDTO,
  InvoiceDTO,
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
  const client = useQueryClient();
  const queue = getProjectStatusQueue(client);
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: async ({ signal }) => {
      const revision = queue.revision;
      const data = await api.get<ProjectListResponse>("/projects", params, { signal });
      return { ...data, items: data.items.map((item) => queue.overlay(item, revision)) };
    },
    placeholderData: keepPreviousData,
  });
}

// ── fetchFn (ManageSheet용) ─────────────────────────────────

export const fetchProject = async (id: string, signal?: AbortSignal) => {
  const queue = getProjectStatusQueue(queryClient);
  const revision = queue.revision;
  const data = await api.get<ProjectWithDetails>(`/projects/${id}`, undefined, { signal });
  return queue.overlay(data, revision);
};

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
  billingClientId: string | null;
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
  const client = useQueryClient();
  const queue = getProjectStatusQueue(client);
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; status?: ProjectStatus; workPhase?: WorkPhase }) =>
      queue.enqueue(id, patch, getCachedProjectStatus(client, id)),
  });
}

// ── 수금 ────────────────────────────────────────────────────

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      ...data
    }: {
      projectId: string;
      invoiceId?: string | null;
      description: string;
      amount: number;
      paidDate: string;
      paymentType: "deposit" | "interim" | "balance" | "additional";
    }) => api.post<CollectionDTO>(`/projects/${projectId}/collections`, data),
    onMutate: async ({ projectId, invoiceId, description, amount, paidDate, paymentType }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });
      const previous = queryClient.getQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId));
      queryClient.setQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId), (old) =>
        old
          ? {
              ...old,
              collections: [
                ...old.collections,
                {
                  id: crypto.randomUUID(),
                  projectId,
                  invoiceId: invoiceId ?? null,
                  description,
                  amount: String(amount),
                  paidDate,
                  paymentType,
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
      toast.error(CRUD_ERRORS.CREATE_FAILED("수금 내역"));
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      collectionId,
      ...data
    }: {
      projectId: string;
      collectionId: string;
      description?: string;
      amount?: number;
      paidDate?: string;
      paymentType?: string;
      invoiceId?: string | null;
    }) => api.patch<CollectionDTO>(`/projects/collections/${collectionId}`, data),
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("수금 내역"));
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, collectionId }: { projectId: string; collectionId: string }) =>
      api.delete<{ id: string }>(`/projects/collections/${collectionId}`),
    onMutate: async ({ projectId, collectionId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });
      const previous = queryClient.getQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId));
      queryClient.setQueryData<ProjectWithDetails>(queryKeys.projects.detail(projectId), (old) =>
        old
          ? { ...old, collections: old.collections.filter((c) => c.id !== collectionId) }
          : old
      );
      return { previous };
    },
    onError: (_err, { projectId }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previous);
      toast.error(CRUD_ERRORS.DELETE_FAILED("수금 내역"));
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

// ── 세금계산서 ────────────────────────────────────────────────

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      ...data
    }: {
      projectId: string;
      paymentType: "deposit" | "interim" | "balance" | "additional";
      description: string;
      amount: number;
      issueDate: string;
    }) => api.post<InvoiceDTO>(`/projects/${projectId}/invoices`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("세금계산서"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("세금계산서"));
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      invoiceId,
      ...data
    }: {
      projectId: string;
      invoiceId: string;
      paymentType?: string;
      description?: string;
      amount?: number;
      issueDate?: string;
    }) => api.patch<InvoiceDTO>(`/projects/invoices/${invoiceId}`, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("세금계산서"));
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, invoiceId }: { projectId: string; invoiceId: string }) =>
      api.delete<{ id: string }>(`/projects/invoices/${invoiceId}`),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("세금계산서"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("세금계산서"));
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
