import { ManageList } from "../_base/ui";
import { listColumns } from "./list-columns";
import type { AdminDTO } from "./types";

interface ListProps {
  data: AdminDTO[];
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
