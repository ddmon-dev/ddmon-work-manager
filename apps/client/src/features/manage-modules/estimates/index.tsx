import { APP_CONFIG } from "@/app.config";
import { useQueryParams } from "@/shared/hooks/use-query-params";
import { CategoryButtonGroup } from "@/shared/ui/category-button-group";
import { ManageContainer } from "../_base/ui";
import { useEstimateList } from "./api";
import { CONFIG } from "./config";
import { List } from "./list";
import { ItemSheet } from "./item-sheet";

const ESTIMATE_STATUSES = [
  { value: "pending", label: "검토중" },
  { value: "contracted", label: "계약됨" },
  { value: "expired", label: "만료됨" },
];

export function EstimatesModule() {
  const { get } = useQueryParams();
  const page = Number(get("page") ?? 1);
  const pageSize = Number(
    get("pageSize") ?? APP_CONFIG.UI.PAGINATION.PAGE_SIZE_OPTIONS[0]
  );
  const search = get("search") ?? undefined;
  const status = get("status") || undefined;

  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useEstimateList({ page, pageSize, search, status });

  return (
    <ManageContainer
      moduleName={CONFIG.moduleName}
      headerAddons={<CategoryButtonGroup options={ESTIMATE_STATUSES} paramKey="status" />}
    >
      <List data={data?.items ?? []} totalCount={data?.total ?? 0} isLoading={isLoading} isFetching={isFetching} isPlaceholderData={isPlaceholderData} error={error} onRetry={() => void refetch()} />
      <ItemSheet />
    </ManageContainer>
  );
}
