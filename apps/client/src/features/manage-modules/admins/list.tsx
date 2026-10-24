import type { ManageListState } from "../_base/ui/manage-list";
import { ManageList } from "../_base/ui";
import { listColumns } from "./list-columns";
import type { AdminDTO } from "./types";

interface ListProps extends ManageListState {
  data: AdminDTO[];
  totalCount: number;
}

export function List({ data, totalCount, ...state }: ListProps) {
  return (
    <ManageList
      data={data}
      totalCount={totalCount}
      {...state}
      listColumns={listColumns}
    />
  );
}
