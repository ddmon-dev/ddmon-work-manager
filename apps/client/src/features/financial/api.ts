import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { RevenueData, SettlementData } from "./types";

// ── Revenue ──────────────────────────────────────────────────

export function useRevenueData(year: number) {
  return useQuery({
    queryKey: queryKeys.revenue.byYear(year),
    queryFn: () => api.get<RevenueData>("/revenue", { year }),
  });
}

// ── Settlement ───────────────────────────────────────────────

export function useSettlementData(year: number, month: number | null) {
  return useQuery({
    queryKey: queryKeys.settlement.byMonth(year, month ?? 0),
    queryFn: () => {
      const params: Record<string, number> = { year };
      if (month !== null) params.month = month;
      return api.get<SettlementData>("/settlement", params);
    },
  });
}

export function useBatchMarkCollections(year: number, month: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { invoiceIds: string[]; paidDate: string }) =>
      api.patch("/settlement/collections/batch", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settlement.byMonth(year, month ?? 0) });
      queryClient.invalidateQueries({ queryKey: queryKeys.revenue.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.revenueSummary });
      toast.success(`${variables.invoiceIds.length}건 수금 완료 처리됨`);
    },
  });
}

export function useBatchMarkWithholdings(year: number, month: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { partnerPaymentIds: string[]; reportedDate: string }) =>
      api.patch("/settlement/withholdings/batch", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settlement.byMonth(year, month ?? 0) });
      toast.success(`${variables.partnerPaymentIds.length}건 신고 완료 처리됨`);
    },
  });
}
