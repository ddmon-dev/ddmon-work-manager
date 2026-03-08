import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { DetailSectionTitle } from "../../_base/ui";
import type { TaskCategory } from "@packages/schemas";
import {
  useProjectScheduleList,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
  useReorderProjectSchedules,
  useSplitProjectSchedule,
  useMergeProjectSchedule,
} from "../api";
import type { ProjectScheduleDTO } from "../types";
import { useGantt } from "./use-gantt";
import { TimelineHeader } from "./timeline-header";
import { GanttGrid } from "./gantt-grid";
import { GanttBar } from "./gantt-bar";
import { SchedulePopover } from "./schedule-popover";
import {
  dateToX,
  startOfDay,
  parseISO,
  differenceInCalendarDays,
  format,
  ROW_HEIGHT,
  DAY_WIDTH,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
} from "./utils";

function groupSchedules(schedules: ProjectScheduleDTO[]): ProjectScheduleDTO[][] {
  const groups: ProjectScheduleDTO[][] = [];
  const seen = new Set<string>();
  for (const s of schedules) {
    if (seen.has(s.id)) continue;
    if (s.groupId) {
      const group = schedules.filter((x) => x.groupId === s.groupId);
      group.forEach((x) => seen.add(x.id));
      groups.push(group);
    } else {
      seen.add(s.id);
      groups.push([s]);
    }
  }
  return groups;
}

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
  const groups = useMemo(() => groupSchedules(items), [items]);

  const createSchedule = useCreateProjectSchedule();
  const updateSchedule = useUpdateProjectSchedule();
  const reorderSchedules = useReorderProjectSchedules();
  const splitSchedule = useSplitProjectSchedule();
  const mergeSchedule = useMergeProjectSchedule();

  const { range, totalWidth } = useGantt({
    schedules: items,
    contractDate,
    deliveredDate,
    completedDate,
  });

  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);
  const [popover, setPopover] = useState<{ schedule: ProjectScheduleDTO; rect: DOMRect } | null>(null);
  const [createState, setCreateState] = useState<{
    startDate: string;
    endDate?: string;
    rowIndex: number;
    insertIndex: number;
    anchorRect: DOMRect;
  } | null>(null);
  const [dragReorder, setDragReorder] = useState<{ fromIndex: number; toIndex: number; scheduleId: string } | null>(null);

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

  const handleEmptyClick = (date: Date, rowIndex: number, anchorRect: DOMRect) => {
    setPopover(null);
    const insertIndex = rowIndex < groups.length
      ? groups.slice(0, rowIndex + 1).flat().length
      : items.length;
    setCreateState({
      startDate: format(date, "yyyy-MM-dd"),
      rowIndex,
      insertIndex,
      anchorRect,
    });
  };

  const handleDragCreate = (startDate: Date, endDate: Date, rowIndex: number, anchorRect: DOMRect) => {
    setPopover(null);
    const insertIndex = rowIndex < groups.length
      ? groups.slice(0, rowIndex + 1).flat().length
      : items.length;
    setCreateState({
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      rowIndex,
      insertIndex,
      anchorRect,
    });
  };

  const handleCreateSubmit = useCallback((title: string, category: TaskCategory) => {
    if (!createState) return;

    createSchedule.mutate({
      title,
      startDate: createState.startDate,
      endDate: createState.endDate,
      projectId,
      category,
      sortOrder: createState.insertIndex,
    }, {
      onSuccess: () => {
        const reorderItems = items
          .filter((_, i) => i >= createState.insertIndex)
          .map((item, i) => ({ id: item.id, sortOrder: createState.insertIndex + 1 + i }));
        if (reorderItems.length > 0) {
          reorderSchedules.mutate(reorderItems);
        }
      },
    });
    setCreateState(null);
  }, [createState, projectId, items, createSchedule, reorderSchedules]);

  const handleDateChange = useCallback((id: string, newStartDate: string, newEndDate: string | null) => {
    const schedule = items.find((s) => s.id === id);
    if (schedule?.groupId) {
      const newEnd = newEndDate ?? newStartDate;
      const sibling = items.find((s) =>
        s.id !== id && s.groupId === schedule.groupId &&
        newStartDate <= (s.endDate ?? s.startDate) && newEnd >= s.startDate
      );
      if (sibling) {
        mergeSchedule.mutate({ sourceId: id, targetId: sibling.id });
        return;
      }
    }
    updateSchedule.mutate({ id, data: { startDate: newStartDate, endDate: newEndDate } });
  }, [items, updateSchedule, mergeSchedule]);

  const handleRowChange = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const reordered = [...groups];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      const flat = reordered.flat();
      reorderSchedules.mutate(
        flat.map((item, i) => ({ id: item.id, sortOrder: i }))
      );
    },
    [groups, reorderSchedules]
  );

  const handleBarClick = useCallback((schedule: ProjectScheduleDTO, rect: DOMRect) => {
    setCreateState(null);
    setPopover({ schedule, rect });
  }, []);

  const handleSplit = useCallback((id: string, splitDate: string) => {
    splitSchedule.mutate({ id, data: { splitDate } });
  }, [splitSchedule]);

  // groups + 하단 빈 행 (클릭 영역) — 최소 1행
  const rowCount = Math.max(groups.length + 1, 1);

  return (
    <div>
      <DetailSectionTitle>일정</DetailSectionTitle>

      <div className="rounded-lg border border-border overflow-hidden">
        <div
          ref={scrollRef}
          className="overflow-x-auto hide-scrollbar"
        >
          <div style={{ width: totalWidth }}>
            <TimelineHeader
              rangeStart={range.start}
              rangeEnd={range.end}
              totalWidth={totalWidth}
              hoverCol={hoverCell?.col}
            />
            <GanttGrid
              rangeStart={range.start}
              rangeEnd={range.end}
              totalWidth={totalWidth}
              rowCount={rowCount}
              onEmptyClick={handleEmptyClick}
              onDragCreate={handleDragCreate}
              onHoverCell={setHoverCell}
            >
              {groups.map((group, groupIdx) =>
                group.map((schedule) => {
                  const isSibling = dragReorder
                    && groupIdx === dragReorder.fromIndex
                    && schedule.id !== dragReorder.scheduleId;
                  return (
                    <GanttBar
                      key={schedule.id}
                      schedule={schedule}
                      rowIndex={isSibling ? dragReorder.toIndex : getVisualIndex(groupIdx)}
                      rangeStart={range.start}
                      totalRows={groups.length}
                      onDateChange={handleDateChange}
                      onRowChange={handleRowChange}
                      onBarClick={handleBarClick}
                      onSplit={handleSplit}
                      onDragRow={(toIndex) => setDragReorder({ fromIndex: groupIdx, toIndex, scheduleId: schedule.id })}
                      onDragEnd={() => setDragReorder(null)}
                    />
                  );
                })
              )}

              {/* 빈 상태 안내 */}
              {items.length === 0 && !createState && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="text-xs text-muted-foreground/60">
                    간트 영역을 클릭하여 일정을 추가하세요
                  </span>
                </div>
              )}

              {/* 고스트 바 */}
              {createState && (() => {
                const left = dateToX(parseISO(createState.startDate), range.start);
                const days = createState.endDate
                  ? differenceInCalendarDays(parseISO(createState.endDate), parseISO(createState.startDate)) + 1
                  : 1;
                const width = Math.max(days * DAY_WIDTH, DAY_WIDTH);
                const top = createState.rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;
                return (
                  <div
                    data-gantt-bar
                    className="absolute rounded-md bg-primary/20 border border-primary/40 z-20"
                    style={{ left, width, top, height: BAR_HEIGHT }}
                  />
                );
              })()}
            </GanttGrid>
          </div>
        </div>

        {createState && (
          <SchedulePopover
            startDate={createState.startDate}
            endDate={createState.endDate}
            anchorRect={createState.anchorRect}
            containerRef={scrollRef}
            onCreate={handleCreateSubmit}
            onClose={() => setCreateState(null)}
          />
        )}
      </div>

      {popover && (
        <SchedulePopover
          schedule={popover.schedule}
          anchorRect={popover.rect}
          containerRef={scrollRef}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
