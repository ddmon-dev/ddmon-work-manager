import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import type { RevenueData } from "./types";

export function useRevenueData(year: number) {
  return useQuery({
    queryKey: queryKeys.revenue.byYear(year),
    queryFn: () => api.get<RevenueData>("/revenue", { year }),
  });
}
