import { useSearchParams } from "react-router";
import { ManageContainer } from "../_base/ui";
import { useAdminList } from "./api";
import { CONFIG } from "./config";
import { List } from "./list";
import { ItemSheet } from "./item-sheet";

export function AdminsModule() {
  const [searchParams] = useSearchParams();

  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 15;
  const search = searchParams.get("search") || undefined;

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
