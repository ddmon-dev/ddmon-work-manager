import { useQueryParams } from "@/shared/hooks/use-query-params";
import { ManageContainer } from "../_base/ui/manage-container";
import { useMonthlySchedules } from "./api";
import { CONFIG } from "./config";
import { ItemSheet } from "./item-sheet";
import { CalendarView } from "./calendar-view";
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

  const { data: schedules, isLoading } = useMonthlySchedules(year, month);

  return (
    <ManageContainer
      moduleName={CONFIG.moduleName}
      hideSearchBar
      hideCreateButton
    >
      {isLoading ? null : (
        <div className="flex flex-col gap-4 flex-1 pb-12">
          <CalendarNav year={year} month={month} />
          <CalendarView year={year} month={month} schedules={schedules ?? []} />
        </div>
      )}
      <ItemSheet />
    </ManageContainer>
  );
}
