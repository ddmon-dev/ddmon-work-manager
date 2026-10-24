import { useQueryParams } from "@/shared/hooks/use-query-params";
import { ManageContainer } from "../_base/ui/manage-container";
import { useMonthlySchedules } from "./api";
import { CONFIG } from "./config";
import { ItemSheet } from "./item-sheet";
import { CalendarView } from "./calendar-view";
import { QueryError } from "@/shared/ui/query-error";
import { CalendarNav } from "./calendar-nav";

export function SchedulesModule() {
  const { get } = useQueryParams();
  const now = new Date();
  const year = get("year")
    ? Number(get("year"))
    : now.getFullYear();
  const month = get("month")
    ? Number(get("month"))
    : now.getMonth() + 1;

  const { data: schedules, isLoading, error, refetch } = useMonthlySchedules(year, month);

  return (
    <ManageContainer
      moduleName={CONFIG.moduleName}
      hideSearchBar
      hideCreateButton
    >
      <div className="flex flex-col gap-4 flex-1 pb-12">
        <CalendarNav year={year} month={month} />
        {error && !schedules ? (
          <QueryError onRetry={() => void refetch()} message="캘린더 일정을 불러오지 못했습니다." />
        ) : (
          <CalendarView year={year} month={month} schedules={schedules ?? []} isLoading={isLoading} />
        )}
        {error && schedules && <QueryError floating onRetry={() => void refetch()} />}
      </div>
      <ItemSheet />
    </ManageContainer>
  );
}
