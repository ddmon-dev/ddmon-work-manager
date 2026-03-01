import { ManageList } from "../_base/ui";
import { listColumns } from "./list-columns";
import type { AdminDTO } from "./types";

interface ListProps {
  data: AdminDTO[];
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
    />
  );
}
