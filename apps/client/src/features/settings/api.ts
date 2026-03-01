import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { BusinessInfo } from "./types";

export function useBusinessInfo() {
  return useQuery({
    queryKey: queryKeys.businessInfo.single,
    queryFn: () => api.get<BusinessInfo | null>("/business-info"),
  });
}

export function useUpdateBusinessInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; ceo: string; bizNumber: string; address: string }) =>
      api.put<BusinessInfo>("/business-info", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businessInfo.single });
      toast.success("사업자 정보가 저장됐습니다.");
    },
    onError: () => {
      toast.error("저장에 실패했습니다.");
    },
  });
}
