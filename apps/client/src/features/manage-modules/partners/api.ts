import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import { createMemoHooks } from "../_base/hooks/use-memo-mutations";
import type { PartnerDTO, PartnerWithMemos, PartnerListResponse } from "./types";
import type { PartnerWriteInput } from "@packages/schemas";

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

// ── 목록 조회 ────────────────────────────────────────────────

export function usePartnerList(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.partners.list(params),
    queryFn: () =>
      api.get<PartnerListResponse>("/partners", {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      }),
    placeholderData: keepPreviousData,
  });
}

// ── 상세 조회 ────────────────────────────────────────────────

export function usePartner(id: string, options?: Partial<UseQueryOptions<PartnerWithMemos>>) {
  return useQuery({
    queryKey: queryKeys.partners.detail(id),
    queryFn: () => api.get<PartnerWithMemos>(`/partners/${id}`),
    enabled: !!id,
    ...options,
  });
}

// ── fetchFn (ManageSheet용) ─────────────────────────────────

export const fetchPartner = (id: string) =>
  api.get<PartnerWithMemos>(`/partners/${id}`);

// ── 생성 ────────────────────────────────────────────────────

export function useCreatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PartnerWriteInput) =>
      api.post<PartnerDTO>("/partners", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("파트너"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("파트너"));
    },
  });
}

// ── 수정 ────────────────────────────────────────────────────

export function useUpdatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PartnerWriteInput> }) =>
      api.patch<PartnerDTO>(`/partners/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.detail(id) });
      toast.success(SUCCESS_MESSAGES.UPDATE_SUCCESS("파트너"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("파트너"));
    },
  });
}

// ── 삭제 ────────────────────────────────────────────────────

export function useDeletePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/partners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("파트너"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("파트너"));
    },
  });
}

// ── 메모 ────────────────────────────────────────────────────

const {
  useCreateMemo: useCreatePartnerMemo,
  useUpdateMemo: useUpdatePartnerMemo,
  useDeleteMemo: useDeletePartnerMemo,
} = createMemoHooks<PartnerWithMemos>({
  basePath: "/partners",
  detailQueryKey: (parentId) => queryKeys.partners.detail(parentId),
});

export { useCreatePartnerMemo, useUpdatePartnerMemo, useDeletePartnerMemo };
