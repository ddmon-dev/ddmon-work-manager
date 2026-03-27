import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
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
  status?: string;
}

export function useEstimateList(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.estimates.list(params as Record<string, unknown>),
    queryFn: () =>
      api.get<EstimateListResponse>("/estimates", {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
      }),
    placeholderData: keepPreviousData,
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
    onMutate: async ({ estimateNumber, status, finalEstimateId }) => {
      await queryClient.cancelQueries({ queryKey: ["estimates", "list"] });
      await queryClient.cancelQueries({ queryKey: ["estimates", "detail"] });
      const previousLists = queryClient.getQueriesData<EstimateListResponse>({ queryKey: ["estimates", "list"] });
      const previousDetails = queryClient.getQueriesData<EstimateWithDetails>({ queryKey: ["estimates", "detail"] });
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
      queryClient.setQueriesData<EstimateWithDetails>({ queryKey: ["estimates", "detail"] }, (old) => {
        if (!old || old.estimateNumber !== estimateNumber) return old;
        return {
          ...old,
          series: old.series
            ? {
                ...old.series,
                status: status as EstimateStatus,
                ...(finalEstimateId !== undefined ? { finalEstimateId } : {}),
              }
            : old.series,
        };
      });
      return { previousLists, previousDetails };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      if (context?.previousDetails) {
        context.previousDetails.forEach(([key, data]) => queryClient.setQueryData(key, data));
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
      await queryClient.cancelQueries({ queryKey: ["estimates", "list"] });
      await queryClient.cancelQueries({ queryKey: ["estimates", "detail"] });
      const previousLists = queryClient.getQueriesData<EstimateListResponse>({ queryKey: ["estimates", "list"] });
      const previousDetails = queryClient.getQueriesData<EstimateWithDetails>({ queryKey: ["estimates", "detail"] });
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
      queryClient.setQueriesData<EstimateWithDetails>({ queryKey: ["estimates", "detail"] }, (old) => {
        if (!old || old.estimateNumber !== estimateNumber) return old;
        return {
          ...old,
          series: old.series ? { ...old.series, finalEstimateId } : old.series,
        };
      });
      return { previousLists, previousDetails };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      if (context?.previousDetails) {
        context.previousDetails.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      toast.error(CRUD_ERRORS.UPDATE_FAILED("계약 버전"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all });
    },
  });
}

export function useDeleteEstimateVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/estimates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || CRUD_ERRORS.DELETE_FAILED("견적서 버전"));
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
