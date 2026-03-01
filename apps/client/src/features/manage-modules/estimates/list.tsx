import { ManageList } from "../_base/ui";
import { listColumns } from "./list-columns";
import type { EstimateListItem } from "./types";

interface ListProps {
  data: EstimateListItem[];
  totalCount: number;
  isLoading?: boolean;
  isPlaceholderData?: boolean;
}

export function List({ data, totalCount, isLoading, isPlaceholderData }: ListProps) {
  return (
    <ManageList
      data={data}
      totalCount={totalCount}
      isLoading={isLoading}
      isPlaceholderData={isPlaceholderData}
      listColumns={listColumns}
      rowClickMode="view"
    />
  );
}
