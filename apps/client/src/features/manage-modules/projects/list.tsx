import { ManageList } from "../_base/ui/manage-list";
import { listColumns } from "./list-columns";
import type { ProjectDTO } from "./types";

interface ListProps {
  data: ProjectDTO[];
  totalCount: number;
  isLoading?: boolean;
}

export function List({ data, totalCount, isLoading }: ListProps) {
  return (
    <ManageList
      data={data}
      totalCount={totalCount}
      isLoading={isLoading}
      listColumns={listColumns}
      rowClickMode="view"
    />
  );
}
