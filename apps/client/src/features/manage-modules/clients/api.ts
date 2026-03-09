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
import type { ClientDTO, ClientWithMemos, ClientListResponse } from "./types";
import type { ClientWriteInput } from "@packages/schemas";

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

// ── 목록 조회 ────────────────────────────────────────────────

export function useClientList(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: () =>
      api.get<ClientListResponse>("/clients", {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      }),
    placeholderData: keepPreviousData,
  });
}

// ── 상세 조회 ────────────────────────────────────────────────

export function useClient(id: string, options?: Partial<UseQueryOptions<ClientWithMemos>>) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => api.get<ClientWithMemos>(`/clients/${id}`),
    enabled: !!id,
    ...options,
  });
}

// ── fetchFn (ManageSheet용) ─────────────────────────────────

export const fetchClient = (id: string) =>
  api.get<ClientWithMemos>(`/clients/${id}`);

// ── 생성 ────────────────────────────────────────────────────

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClientWriteInput) =>
      api.post<ClientDTO>("/clients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("클라이언트"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("클라이언트"));
    },
  });
}

// ── 수정 ────────────────────────────────────────────────────

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientWriteInput> }) =>
      api.patch<ClientDTO>(`/clients/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(id) });
      toast.success(SUCCESS_MESSAGES.UPDATE_SUCCESS("클라이언트"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("클라이언트"));
    },
  });
}

// ── 삭제 ────────────────────────────────────────────────────

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("클라이언트"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("클라이언트"));
    },
  });
}

// ── 메모 ────────────────────────────────────────────────────

const {
  useCreateMemo: useCreateClientMemo,
  useUpdateMemo: useUpdateClientMemo,
  useDeleteMemo: useDeleteClientMemo,
} = createMemoHooks<ClientWithMemos>({
  basePath: "/clients",
  detailQueryKey: (parentId) => queryKeys.clients.detail(parentId),
});

export { useCreateClientMemo, useUpdateClientMemo, useDeleteClientMemo };
