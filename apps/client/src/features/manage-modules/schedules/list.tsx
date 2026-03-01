import { ManageList } from "../_base/ui/manage-list";
import { listColumns } from "./list-columns";
import type { ScheduleDTO } from "./types";

interface ListProps {
  data: ScheduleDTO[];
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
