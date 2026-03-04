import { useRef, useEffect, useCallback, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DetailSectionTitle } from "../../_base/ui";
import {
  useScheduleList,
  useCreateSchedule,
  useUpdateSchedule,
  useReorderSchedules,
} from "../../schedules/api";
import type { ScheduleDTO } from "../../schedules/types";
import { useGantt } from "./use-gantt";
import { TimelineHeader } from "./timeline-header";
import { GanttGrid } from "./gantt-grid";
import { GanttBar } from "./gantt-bar";
import { BarPopover } from "./bar-popover";
import { InlineCreateRow } from "./inline-create-row";
import { dateToX, startOfDay } from "./utils";

interface GanttChartProps {
  projectId: string;
  clientId: string;
  contractDate?: string | null;
  deliveredDate?: string | null;
  completedDate?: string | null;
}

export function GanttChart({
  projectId,
  clientId,
  contractDate,
  deliveredDate,
  completedDate,
}: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data } = useScheduleList({ projectId, pageSize: 50 });
  const items = data?.items ?? [];

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const reorderSchedules = useReorderSchedules();

  const {
    range,
    totalWidth,
    inlineCreate,
    startInlineCreate,
    cancelInlineCreate,
  } = useGantt({
    schedules: items,
    contractDate,
    deliveredDate,
    completedDate,
  });

  // Popover 상태
  const [popover, setPopover] = useState<{ schedule: ScheduleDTO; rect: DOMRect } | null>(null);

  // 초기 스크롤: 오늘이 보이도록
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayX = dateToX(startOfDay(new Date()), range.start);
    const containerWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 3);
  }, [range.start]);

  const handleEmptyClick = (date: Date) => {
    setPopover(null);
    startInlineCreate(date);
  };

  const handleInlineSubmit = (title: string, startDate: string) => {
    createSchedule.mutate({
      title,
      startDate,
      projectId,
      clientId,
      color: "default",
      recurrenceType: "none",
      sortOrder: items.length,
    });
  };

  const handleDateChange = (id: string, newStartDate: string, newEndDate: string | null) => {
    updateSchedule.mutate({
      id,
      data: { startDate: newStartDate, endDate: newEndDate },
    });
  };

  const handleRowChange = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const reordered = [...items];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      reorderSchedules.mutate(
        reordered.map((item, i) => ({ id: item.id, sortOrder: i }))
      );
    },
    [items, reorderSchedules]
  );

  const handleBarClick = useCallback((schedule: ScheduleDTO, rect: DOMRect) => {
    setPopover({ schedule, rect });
  }, []);

  const handleAddClick = () => {
    startInlineCreate(new Date());
  };

  const rowCount = items.length + (inlineCreate ? 1 : 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <DetailSectionTitle>일정</DetailSectionTitle>
        <Button variant="ghost" size="icon-xs" onClick={handleAddClick}>
          <PlusIcon className="size-4" />
        </Button>
      </div>

      {items.length === 0 && !inlineCreate ? (
        <button
          type="button"
          onClick={handleAddClick}
          className="w-full py-6 text-sm text-muted-foreground text-center hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors cursor-pointer"
        >
          클릭하여 일정을 추가하세요
        </button>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-x-auto rounded-lg border border-border"
        >
          <div style={{ width: totalWidth }}>
            <TimelineHeader
              rangeStart={range.start}
              rangeEnd={range.end}
              totalWidth={totalWidth}
            />
            <GanttGrid
              rangeStart={range.start}
              rangeEnd={range.end}
              totalWidth={totalWidth}
              rowCount={rowCount}
              onEmptyClick={handleEmptyClick}
            >
              {items.map((schedule, i) => (
                <GanttBar
                  key={schedule.id}
                  schedule={schedule}
                  rowIndex={i}
                  rangeStart={range.start}
                  totalRows={items.length}
                  onDateChange={handleDateChange}
                  onRowChange={handleRowChange}
                  onBarClick={handleBarClick}
                />
              ))}

              {inlineCreate && (
                <InlineCreateRow
                  dateStr={inlineCreate.date}
                  rowIndex={items.length}
                  rangeStart={range.start}
                  onSubmit={handleInlineSubmit}
                  onCancel={cancelInlineCreate}
                />
              )}
            </GanttGrid>
          </div>
        </div>
      )}

      {popover && (
        <BarPopover
          schedule={popover.schedule}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
