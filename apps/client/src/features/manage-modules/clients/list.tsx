import type { ManageListState } from "../_base/ui/manage-list";
import { ManageList } from "../_base/ui";
import { listColumns } from "./list-columns";
import type { ClientDTO } from "./types";

interface ListProps extends ManageListState {
  data: ClientDTO[];
  totalCount: number;
}

export function List({ data, totalCount, ...state }: ListProps) {
  return (
    <ManageList
      data={data}
      totalCount={totalCount}
      {...state}
      listColumns={listColumns}
      rowClickMode="view"
    />
  );
}
