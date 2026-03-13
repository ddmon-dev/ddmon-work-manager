import { useSearchParams } from "react-router";
import { APP_CONFIG } from "@/app.config";
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
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(
    searchParams.get("pageSize") ?? APP_CONFIG.UI.PAGINATION.PAGE_SIZE_OPTIONS[0]
  );
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") || undefined;

  const { data, isLoading } = useEstimateList({ page, pageSize, search, status });

  return (
    <ManageContainer
      moduleName={CONFIG.moduleName}
      headerAddons={<CategoryButtonGroup options={ESTIMATE_STATUSES} paramKey="status" />}
    >
      <List data={data?.items ?? []} totalCount={data?.total ?? 0} isLoading={isLoading} />
      <ItemSheet />
    </ManageContainer>
  );
}
