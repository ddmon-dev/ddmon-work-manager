import { APP_CONFIG } from "@/app.config";
import { useQueryParams } from "@/shared/hooks/use-query-params";
import { ManageContainer } from "../_base/ui";
import { useAdminList } from "./api";
import { CONFIG } from "./config";
import { List } from "./list";
import { ItemSheet } from "./item-sheet";

export function AdminsModule() {
  const { get } = useQueryParams();

  const page = Number(get("page")) || 1;
  const pageSize = Number(get("pageSize")) || APP_CONFIG.UI.PAGINATION.PAGE_SIZE_OPTIONS[0];
  const search = get("search") || undefined;

  const { data, isLoading } = useAdminList({ page, pageSize, search });

  const items = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  return (
    <ManageContainer moduleName={CONFIG.moduleName}>
      <List data={items} totalCount={totalCount} isLoading={isLoading} />
      <ItemSheet />
    </ManageContainer>
  );
}
