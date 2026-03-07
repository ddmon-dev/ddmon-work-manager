import { useRef, useEffect, useCallback, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DetailSectionTitle } from "../../_base/ui";
import type { TaskCategory } from "@packages/schemas";
import {
  useProjectScheduleList,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
  useReorderProjectSchedules,
} from "../api";
import type { ProjectScheduleDTO } from "../types";
import { useGantt } from "./use-gantt";
import { TimelineHeader } from "./timeline-header";
import { GanttGrid } from "./gantt-grid";
import { GanttBar } from "./gantt-bar";
import { BarPopover } from "./bar-popover";
import { InlineCreateRow } from "./inline-create-row";
import { dateToX, startOfDay, parseISO, ROW_HEIGHT } from "./utils";

interface ProjectGanttProps {
  projectId: string;
  clientId: string;
  contractDate?: string | null;
  deliveredDate?: string | null;
  completedDate?: string | null;
}

export function ProjectGantt({
  projectId,
  clientId,
  contractDate,
  deliveredDate,
  completedDate,
}: ProjectGanttProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data } = useProjectScheduleList(projectId);
  const items = data?.items ?? [];

  const createSchedule = useCreateProjectSchedule();
  const updateSchedule = useUpdateProjectSchedule();
  const reorderSchedules = useReorderProjectSchedules();

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

  const [popover, setPopover] = useState<{ schedule: ProjectScheduleDTO; rect: DOMRect } | null>(null);
  const [dragReorder, setDragReorder] = useState<{ fromIndex: number; toIndex: number } | null>(null);

  const getVisualIndex = useCallback(
    (i: number) => {
      if (!dragReorder || i === dragReorder.fromIndex) return i;
      const { fromIndex, toIndex } = dragReorder;
      if (fromIndex < toIndex) {
        if (i > fromIndex && i <= toIndex) return i - 1;
      } else {
        if (i >= toIndex && i < fromIndex) return i + 1;
      }
      return i;
    },
    [dragReorder]
  );

  const didScroll = useRef(false);
  useEffect(() => {
    if (didScroll.current || !scrollRef.current) return;
    didScroll.current = true;
    const todayX = dateToX(startOfDay(new Date()), range.start);
    const containerWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 3);
  }, [range.start]);

  // 인라인 생성 시 자동 스크롤
  useEffect(() => {
    if (!inlineCreate || !scrollRef.current) return;
    const targetX = dateToX(parseISO(inlineCreate.date), range.start);
    const el = scrollRef.current;
    const viewLeft = el.scrollLeft;
    const viewRight = viewLeft + el.clientWidth;
    if (targetX >= viewLeft + 40 && targetX <= viewRight - 200) return;
    el.scrollTo({ left: Math.max(0, targetX - el.clientWidth / 3), behavior: "smooth" });
  }, [inlineCreate, range.start]);

  const handleEmptyClick = (date: Date, _rowIndex: number) => {
    setPopover(null);
    startInlineCreate(date);
  };

  const handleDragCreate = (startDate: Date, endDate: Date, _rowIndex: number) => {
    setPopover(null);
    startInlineCreate(startDate, endDate);
  };

  const handleInlineSubmit = (title: string, startDate: string, category: TaskCategory) => {
    createSchedule.mutate({
      title,
      startDate,
      endDate: inlineCreate?.endDate,
      projectId,
      category,
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

  const handleBarClick = useCallback((schedule: ProjectScheduleDTO, rect: DOMRect) => {
    setPopover({ schedule, rect });
  }, []);

  const handleAddClick = () => {
    startInlineCreate(new Date());
  };

  // items + (add-schedule 또는 inline-create) 행
  const hasAddRow = !inlineCreate;
  const rowCount = items.length + (inlineCreate ? 1 : hasAddRow ? 1 : 0);

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
        <div className="rounded-lg border border-border overflow-hidden">
          {/* 좌측 일정 목록 + 간트 레이아웃은 단일 컬럼이므로 add-schedule 행은 간트 아래 */}
          <div
            ref={scrollRef}
            className="overflow-x-auto hide-scrollbar"
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
                onDragCreate={handleDragCreate}
              >
                {items.map((schedule, i) => (
                  <GanttBar
                    key={schedule.id}
                    schedule={schedule}
                    rowIndex={getVisualIndex(i)}
                    rangeStart={range.start}
                    totalRows={items.length}
                    onDateChange={handleDateChange}
                    onRowChange={handleRowChange}
                    onBarClick={handleBarClick}
                    onDragRow={(toIndex) => setDragReorder({ fromIndex: i, toIndex })}
                    onDragEnd={() => setDragReorder(null)}
                  />
                ))}

                {inlineCreate ? (
                  <InlineCreateRow
                    dateStr={inlineCreate.date}
                    rowIndex={items.length}
                    rangeStart={range.start}
                    onSubmit={handleInlineSubmit}
                    onCancel={cancelInlineCreate}
                  />
                ) : (
                  <div
                    className="absolute left-0 right-0"
                    style={{ top: items.length * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    <button
                      type="button"
                      onClick={handleAddClick}
                      className="flex items-center gap-1 h-full pl-3 text-xs text-muted-foreground/60 hover:text-muted-foreground cursor-pointer"
                    >
                      <PlusIcon className="size-3" />
                      새 일정
                    </button>
                  </div>
                )}
              </GanttGrid>
            </div>
          </div>
        </div>
      )}

      {popover && (
        <BarPopover
          schedule={popover.schedule}
          anchorRect={popover.rect}
          containerRef={scrollRef}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
