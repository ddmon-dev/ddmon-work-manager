import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { AdminDTO, AdminListResponse } from "./types";

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

// -- 목록 조회 --

export function useAdminList(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.admins.list(params),
    queryFn: () =>
      api.get<AdminListResponse>("/admins", {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      }),
  });
}

// -- 상세 조회 (fetchFn) --

export const fetchAdmin = (id: string) =>
  api.get<AdminDTO>(`/admins/${id}`);

// -- 생성 --

export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      username: string;
      password: string;
      phone?: string;
      superAdmin?: boolean;
    }) => api.post<AdminDTO>("/admins", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admins.all });
      toast.success("관리자가 생성되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "생성에 실패했습니다.");
    },
  });
}

// -- 수정 --

export function useUpdateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        email?: string;
        phone?: string;
        superAdmin?: boolean;
        password?: string;
      };
    }) => api.patch<AdminDTO>(`/admins/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admins.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admins.detail(id) });
      toast.success("관리자가 수정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "수정에 실패했습니다.");
    },
  });
}

// -- 삭제 --

export function useDeleteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/admins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admins.all });
      toast.success("관리자가 삭제되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "삭제에 실패했습니다.");
    },
  });
}
