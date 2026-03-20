import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { SettlementData } from "./types";

export function useSettlementData(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.settlement.byMonth(year, month),
    queryFn: () => api.get<SettlementData>("/settlement", { year, month }),
  });
}

export function useBatchMarkCollections(year: number, month: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { invoiceIds: string[]; paidDate: string }) =>
      api.patch("/settlement/collections/batch", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settlement.byMonth(year, month) });
      toast.success(`${variables.invoiceIds.length}건 수금 완료 처리됨`);
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
