import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { SettlementData } from "./types";

export function useSettlementData(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.settlement.byMonth(year, month),
    queryFn: () => api.get<SettlementData>("/settlement", { year, month }),
  });
}

export function useBatchMarkInvoices(year: number, month: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { paymentIds: string[]; invoiceDate: string }) =>
      api.patch("/settlement/invoices/batch", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settlement.byMonth(year, month) });
    },
  });
}

export function useBatchMarkWithholdings(year: number, month: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { partnerPaymentIds: string[]; reportedDate: string }) =>
      api.patch("/settlement/withholdings/batch", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settlement.byMonth(year, month) });
    },
  });
}
