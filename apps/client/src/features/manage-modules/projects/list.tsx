import type { ManageListState } from "../_base/ui/manage-list";
import { ManageList } from "../_base/ui/manage-list";
import { listColumns } from "./list-columns";
import type { ProjectDTO } from "./types";

interface ListProps extends ManageListState {
  data: ProjectDTO[];
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
