import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { atLeast } from "@/shared/utils/delays";
import { CRUD_ERRORS } from "@/shared/constants/error-messages";
import type {
  EstimateListItem,
  EstimateListResponse,
  EstimateStatus,
  EstimateWithDetails,
  EstimateVersion,
} from "./types";

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function useEstimateList(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.estimates.list(params as Record<string, unknown>),
    queryFn: () =>
      atLeast(() =>
        api.get<EstimateListResponse>("/estimates", {
          page: params.page,
          pageSize: params.pageSize,
          search: params.search,
        })
      ),
  });
}

export async function fetchEstimate(id: string): Promise<EstimateWithDetails> {
  return api.get<EstimateWithDetails>(`/estimates/${id}`);
}

export function useEstimate(id: string) {
  return useQuery({
    queryKey: queryKeys.estimates.detail(id),
    queryFn: () => fetchEstimate(id),
    enabled: !!id,
  });
}

export function useGetVersions(estimateNumber: string) {
  return useQuery({
    queryKey: ["estimates", "series", estimateNumber, "versions"],
    queryFn: () => api.get<EstimateVersion[]>(`/estimates/series/${estimateNumber}/versions`),
    enabled: !!estimateNumber,
  });
}

export function useCreateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<EstimateListItem>("/estimates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all });
    },
  });
}

export function useUpdateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<EstimateListItem>(`/estimates/${id}`, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.detail(id) });
    },
  });
}

export function useUpdateEstimateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      estimateNumber,
      status,
      finalEstimateId,
    }: {
      estimateNumber: string;
      status: string;
      finalEstimateId?: string;
    }) => api.patch(`/estimates/series/${estimateNumber}/status`, { status, finalEstimateId }),
    onMutate: async ({ estimateNumber, status }) => {
      const previousLists = queryClient.getQueriesData<EstimateListResponse>({ queryKey: ["estimates", "list"] });
      queryClient.setQueriesData<EstimateListResponse>({ queryKey: ["estimates", "list"] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((item) =>
                item.estimateNumber === estimateNumber
                  ? { ...item, seriesStatus: status as EstimateStatus }
                  : item
              ),
            }
          : old
      );
      return { previousLists };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      toast.error(CRUD_ERRORS.UPDATE_FAILED("견적서 상태"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all });
    },
  });
}

export function useUpdateFinalVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateNumber, finalEstimateId }: { estimateNumber: string; finalEstimateId: string | null }) =>
      api.patch(`/estimates/series/${estimateNumber}/final`, { finalEstimateId }),
    onMutate: async ({ estimateNumber, finalEstimateId }) => {
      const previousLists = queryClient.getQueriesData<EstimateListResponse>({ queryKey: ["estimates", "list"] });
      queryClient.setQueriesData<EstimateListResponse>({ queryKey: ["estimates", "list"] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((item) =>
                item.estimateNumber === estimateNumber
                  ? { ...item, finalEstimateId }
                  : item
              ),
            }
          : old
      );
      return { previousLists };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      toast.error(CRUD_ERRORS.UPDATE_FAILED("계약 버전"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all });
    },
  });
}

export function useDeleteEstimateSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (estimateNumber: string) =>
      api.delete(`/estimates/series/${estimateNumber}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("견적서"));
    },
  });
}
