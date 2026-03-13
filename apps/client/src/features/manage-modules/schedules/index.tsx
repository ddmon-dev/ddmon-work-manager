import { useSearchParams } from "react-router";
import { ManageContainer } from "../_base/ui/manage-container";
import { useMonthlySchedules } from "./api";
import { CONFIG } from "./config";
import { ItemSheet } from "./item-sheet";
import { CalendarView } from "./calendar-view";
import { CalendarNav } from "./calendar-nav";

export function SchedulesModule() {
  const [searchParams] = useSearchParams();
  const now = new Date();
  const year = searchParams.get("year")
    ? Number(searchParams.get("year"))
    : now.getFullYear();
  const month = searchParams.get("month")
    ? Number(searchParams.get("month"))
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
