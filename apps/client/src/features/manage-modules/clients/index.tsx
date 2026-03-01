import { useSearchParams } from "react-router";
import { APP_CONFIG } from "@/app.config";
import { ManageContainer } from "../_base/ui";
import { useClientList } from "./api";
import { CONFIG } from "./config";
import { List } from "./list";
import { ItemSheet } from "./item-sheet";

export function ClientsModule() {
  const [searchParams] = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || APP_CONFIG.UI.PAGINATION.PAGE_SIZE_OPTIONS[0];
  const search = searchParams.get("search") || undefined;

  const { data, isLoading, isPlaceholderData } = useClientList({ page, pageSize, search });

  const items = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  return (
    <ManageContainer moduleName={CONFIG.moduleName}>
      <List data={items} totalCount={totalCount} isLoading={isLoading} isPlaceholderData={isPlaceholderData} />
      <ItemSheet />
    </ManageContainer>
  );
}
