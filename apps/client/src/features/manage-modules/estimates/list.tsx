import { ManageList } from "../_base/ui";
import { listColumns } from "./list-columns";
import type { EstimateListItem } from "./types";

interface ListProps {
  data: EstimateListItem[];
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
