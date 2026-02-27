import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type {
  EstimateListItem,
  EstimateListResponse,
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
    queryFn: () => api.get<EstimateListResponse>("/estimates", {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
    }),
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
    mutationFn: ({ estimateNumber, status }: { estimateNumber: string; status: string }) =>
      api.patch(`/estimates/series/${estimateNumber}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all });
    },
  });
}

export function useUpdateFinalVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ estimateNumber, finalEstimateId }: { estimateNumber: string; finalEstimateId: string | null }) =>
      api.patch(`/estimates/series/${estimateNumber}/final`, { finalEstimateId }),
    onSuccess: () => {
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
  });
}
