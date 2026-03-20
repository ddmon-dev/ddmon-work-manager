import { useQuery, useMutation, useQueryClient, keepPreviousData, type UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import { SUCCESS_MESSAGES } from "@/shared/constants/success-messages";
import { createMemoHooks } from "../_base/hooks/use-memo-mutations";
import type { ClientEnvironmentDTO, ClientEnvironmentWithMemos, ClientEnvironmentListResponse } from "./types";
import type { ClientEnvironmentWriteInput } from "@packages/schemas";

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export function useClientEnvironmentList(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.clientEnvironments.list(params),
    queryFn: () =>
      api.get<ClientEnvironmentListResponse>("/client-environments", {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useClientEnvironment(id: string, options?: Partial<UseQueryOptions<ClientEnvironmentWithMemos>>) {
  return useQuery({
    queryKey: queryKeys.clientEnvironments.detail(id),
    queryFn: () => api.get<ClientEnvironmentWithMemos>(`/client-environments/${id}`),
    enabled: !!id,
    ...options,
  });
}

export const fetchClientEnvironment = (id: string) =>
  api.get<ClientEnvironmentWithMemos>(`/client-environments/${id}`);

export function useCreateClientEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClientEnvironmentWriteInput) =>
      api.post<ClientEnvironmentDTO>("/client-environments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientEnvironments.all });
      toast.success(SUCCESS_MESSAGES.CREATE_SUCCESS("고객환경정보"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.CREATE_FAILED("고객환경정보"));
    },
  });
}

export function useUpdateClientEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientEnvironmentWriteInput> }) =>
      api.patch<ClientEnvironmentDTO>(`/client-environments/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientEnvironments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clientEnvironments.detail(id) });
      toast.success(SUCCESS_MESSAGES.UPDATE_SUCCESS("고객환경정보"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.UPDATE_FAILED("고객환경정보"));
    },
  });
}

export function useDeleteClientEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/client-environments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientEnvironments.all });
      toast.success(SUCCESS_MESSAGES.DELETE_SUCCESS("고객환경정보"));
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("고객환경정보"));
    },
  });
}

const {
  useCreateMemo: useCreateClientEnvironmentMemo,
  useUpdateMemo: useUpdateClientEnvironmentMemo,
  useDeleteMemo: useDeleteClientEnvironmentMemo,
} = createMemoHooks<ClientEnvironmentWithMemos>({
  basePath: "/client-environments",
  detailQueryKey: (parentId) => queryKeys.clientEnvironments.detail(parentId),
});

export { useCreateClientEnvironmentMemo, useUpdateClientEnvironmentMemo, useDeleteClientEnvironmentMemo };
