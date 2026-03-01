import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { atLeast } from "@/shared/utils/delays";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import type { ClientDTO, ClientWithMemos, ClientListResponse } from "./types";
import type { ClientWriteInput } from "@work-manager/schemas";

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
      atLeast(() =>
        api.get<ClientListResponse>("/clients", {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
        })
      ),
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

export function useCreateClientMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, content }: { clientId: string; content: string }) =>
      api.post(`/clients/${clientId}/memos`, { content }),
    onMutate: async ({ clientId, content }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.clients.detail(clientId) });
      const previous = queryClient.getQueryData<ClientWithMemos>(queryKeys.clients.detail(clientId));
      queryClient.setQueryData<ClientWithMemos>(queryKeys.clients.detail(clientId), (old) =>
        old
          ? {
              ...old,
              memos: [
                ...old.memos,
                {
                  id: crypto.randomUUID(),
                  content,
                  author: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            }
          : old
      );
      return { previous };
    },
    onError: (_err, { clientId }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.clients.detail(clientId), context.previous);
      toast.error(CRUD_ERRORS.CREATE_FAILED("메모"));
    },
    onSettled: (_data, _err, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
    },
  });
}

export function useUpdateClientMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      memoId,
      content,
    }: {
      clientId: string;
      memoId: string;
      content: string;
    }) => api.patch(`/clients/memos/${memoId}`, { content }),
    onMutate: async ({ clientId, memoId, content }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.clients.detail(clientId) });
      const previous = queryClient.getQueryData<ClientWithMemos>(queryKeys.clients.detail(clientId));
      queryClient.setQueryData<ClientWithMemos>(queryKeys.clients.detail(clientId), (old) =>
        old
          ? {
              ...old,
              memos: old.memos.map((m) =>
                m.id === memoId ? { ...m, content } : m
              ),
            }
          : old
      );
      return { previous };
    },
    onError: (_err, { clientId }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.clients.detail(clientId), context.previous);
      toast.error(CRUD_ERRORS.UPDATE_FAILED("메모"));
    },
    onSettled: (_data, _err, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
    },
  });
}

export function useDeleteClientMemo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      memoId,
    }: {
      clientId: string;
      memoId: string;
    }) => api.delete(`/clients/memos/${memoId}`),
    onMutate: async ({ clientId, memoId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.clients.detail(clientId) });
      const previous = queryClient.getQueryData<ClientWithMemos>(queryKeys.clients.detail(clientId));
      queryClient.setQueryData<ClientWithMemos>(queryKeys.clients.detail(clientId), (old) =>
        old
          ? { ...old, memos: old.memos.filter((m) => m.id !== memoId) }
          : old
      );
      return { previous };
    },
    onError: (_err, { clientId }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.clients.detail(clientId), context.previous);
      toast.error(CRUD_ERRORS.DELETE_FAILED("메모"));
    },
    onSettled: (_data, _err, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
    },
  });
}
