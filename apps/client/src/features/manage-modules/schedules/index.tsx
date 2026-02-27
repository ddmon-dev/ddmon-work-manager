import { useSearchParams } from "react-router";
import { APP_CONFIG } from "@/app.config";
import { ManageContainer } from "../_base/ui/manage-container";
import { useScheduleList, useMonthlySchedules } from "./api";
import { CONFIG } from "./config";
import { List } from "./list";
import { ItemSheet } from "./item-sheet";
import { CalendarView } from "./calendar-view";
import { CalendarNav } from "./calendar-nav";
import { CalendarSkeleton } from "./calendar-skeleton";
import { ViewToggle, type ScheduleViewMode } from "./view-toggle";

export function SchedulesModule() {
  const [searchParams] = useSearchParams();
  const view = (searchParams.get("view") as ScheduleViewMode) || "calendar";

  return (
    <ManageContainer
      moduleName={CONFIG.moduleName}
      headerAddons={<ViewToggle />}
      hideSearchBar={view === "calendar"}
      hideCreateButton={view === "calendar"}
    >
      {view === "calendar" ? <CalendarContent /> : <ListContent />}
      <ItemSheet />
    </ManageContainer>
  );
}

function CalendarContent() {
  const [searchParams] = useSearchParams();
  const now = new Date();
  const year = searchParams.get("year")
    ? Number(searchParams.get("year"))
    : now.getFullYear();
  const month = searchParams.get("month")
    ? Number(searchParams.get("month"))
    : now.getMonth() + 1;

  const { data: schedules, isLoading } = useMonthlySchedules(year, month);

  if (isLoading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 flex-1 pb-12">
      <CalendarNav year={year} month={month} />
      <CalendarView year={year} month={month} schedules={schedules ?? []} />
    </div>
  );
}

function ListContent() {
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(
    searchParams.get("pageSize") ?? APP_CONFIG.UI.PAGINATION.PAGE_SIZE_OPTIONS[0]
  );
  const search = searchParams.get("search") ?? undefined;

  const { data, isLoading } = useScheduleList({ page, pageSize, search });

  const items = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  return <List data={items} totalCount={totalCount} isLoading={isLoading} />;
}
