import { useSearchParams } from "react-router";
import { APP_CONFIG } from "@/app.config";
import { ManageContainer } from "../_base/ui";
import { useEstimateList } from "./api";
import { CONFIG } from "./config";
import { List } from "./list";
import { ItemSheet } from "./item-sheet";

export function EstimatesModule() {
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(
    searchParams.get("pageSize") ?? APP_CONFIG.UI.PAGINATION.PAGE_SIZE_OPTIONS[0]
  );
  const search = searchParams.get("search") ?? undefined;

  const { data, isLoading, isPlaceholderData } = useEstimateList({ page, pageSize, search });

  return (
    <ManageContainer moduleName={CONFIG.moduleName}>
      <List data={data?.items ?? []} totalCount={data?.total ?? 0} isLoading={isLoading} isPlaceholderData={isPlaceholderData} />
      <ItemSheet />
    </ManageContainer>
  );
}
