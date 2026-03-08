import { useRef, useCallback, useState, useMemo } from "react";
import { cn } from "@/shared/utils/classnames";
import { DetailSectionTitle } from "../../_base/ui";
import {
  useProjectScheduleList,
  useLaneList,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
} from "../api";
import type { ProjectScheduleDTO } from "../types";
import { useGantt } from "./use-gantt";
import { useScrollToToday } from "./use-scroll-to-today";
import { useLaneDrag } from "./use-lane-drag";
import { useLaneActions } from "./use-lane-actions";
import { TimelineHeader } from "./timeline-header";
import { GanttGrid } from "./gantt-grid";
import { GanttBar } from "./gantt-bar";
import { GhostBar } from "./ghost-bar";
import { LaneRow } from "./lane-row";
import { SchedulePopover } from "./schedule-popover";
import { format, ROW_HEIGHT, LEFT_PANEL_WIDTH } from "./utils";

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
  const { data: scheduleData } = useProjectScheduleList(projectId);
  const { data: laneData } = useLaneList(projectId);
  const items = scheduleData?.items ?? [];
  const lanes = laneData?.items ?? [];

  // 행별 일정 그룹핑
  const laneSchedules = useMemo(() => {
    const map = new Map<string, ProjectScheduleDTO[]>();
    for (const lane of lanes) {
      map.set(lane.id, []);
    }
    for (const s of items) {
      const list = map.get(s.laneId) ?? [];
      list.push(s);
      map.set(s.laneId, list);
    }
    return map;
  }, [lanes, items]);

  const createSchedule = useCreateProjectSchedule();
  const updateSchedule = useUpdateProjectSchedule();

  const { range, totalWidth } = useGantt({
    schedules: items,
    contractDate,
    deliveredDate,
    completedDate,
  });

  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);
  const [popover, setPopover] = useState<{ schedule: ProjectScheduleDTO; rect: DOMRect } | null>(null);
  const [createState, setCreateState] = useState<{
    laneId: string;
    startDate: string;
    endDate?: string;
    rowIndex: number;
    anchorRect: DOMRect;
  } | null>(null);

  // 공유 훅
  useScrollToToday(scrollRef, range.start);

  const {
    editingLaneId, editingLaneTitle, setEditingLaneTitle,
    startEdit, saveEdit, cancelEdit,
    handleDelete: laneDelete, handleAddBelow: laneAddBelow,
    reorder: reorderLane,
  } = useLaneActions();

  const handleLaneReorder = useCallback((fromLocal: number, toLocal: number) => {
    reorderLane(lanes, fromLocal, toLocal);
  }, [lanes, reorderLane]);

  const { laneDrag, laneDropLocal, handleLanePointerDown } = useLaneDrag({
    laneCount: lanes.length,
    onReorder: handleLaneReorder,
  });

  const handleEmptyClick = useCallback((date: Date, rowIndex: number, anchorRect: DOMRect) => {
    if (rowIndex < 0 || rowIndex >= lanes.length) return;
    const lane = lanes[rowIndex];
    setPopover(null);
    setCreateState({
      laneId: lane.id,
      startDate: format(date, "yyyy-MM-dd"),
      rowIndex,
      anchorRect,
    });
  }, [lanes]);

  const handleDragCreate = useCallback((startDate: Date, endDate: Date, rowIndex: number, anchorRect: DOMRect) => {
    if (rowIndex < 0 || rowIndex >= lanes.length) return;
    const lane = lanes[rowIndex];
    setPopover(null);
    setCreateState({
      laneId: lane.id,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      rowIndex,
      anchorRect,
    });
  }, [lanes]);

  const handleCreateSubmit = useCallback((title: string, category: string, categoryColor: string | null) => {
    if (!createState) return;
    createSchedule.mutate({
      title,
      startDate: createState.startDate,
      endDate: createState.endDate,
      projectId,
      laneId: createState.laneId,
      category,
      categoryColor,
    });
    setCreateState(null);
  }, [createState, projectId, createSchedule]);

  const handleDateChange = useCallback((id: string, newStartDate: string, newEndDate: string | null) => {
    updateSchedule.mutate({ id, data: { startDate: newStartDate, endDate: newEndDate } });
  }, [updateSchedule]);

  const handleRowChange = useCallback((scheduleId: string, fromRow: number, toRow: number) => {
    if (fromRow !== toRow && toRow >= 0 && toRow < lanes.length) {
      updateSchedule.mutate({ id: scheduleId, data: { laneId: lanes[toRow].id } });
    }
  }, [lanes, updateSchedule]);

  const handleBarClick = useCallback((schedule: ProjectScheduleDTO, rect: DOMRect) => {
    setCreateState(null);
    setPopover({ schedule, rect });
  }, []);

  const handleDuplicate = useCallback((schedule: ProjectScheduleDTO, newStartDate: string, newEndDate: string | null) => {
    createSchedule.mutate({
      title: schedule.title,
      startDate: newStartDate,
      endDate: newEndDate,
      projectId,
      laneId: schedule.laneId,
      category: schedule.category,
      categoryColor: schedule.categoryColor,
    });
  }, [projectId, createSchedule]);

  const handleLaneAddBelow = useCallback((_laneId: string, localIndex: number) => {
    laneAddBelow(projectId, localIndex, lanes);
  }, [projectId, lanes, laneAddBelow]);

  const rowCount = Math.max(lanes.length, 1);
  const contentHeight = rowCount * ROW_HEIGHT;

  return (
    <div>
      <DetailSectionTitle>일정</DetailSectionTitle>

      <div className="rounded-lg border border-border overflow-hidden">
        <div
          ref={scrollRef}
          className="overflow-auto hide-scrollbar"
        >
          <div className="flex" style={{ width: LEFT_PANEL_WIDTH + totalWidth }}>
            {/* 좌측 고정 패널 */}
            <div
              className="sticky left-0 z-20 shrink-0 border-r border-border bg-background"
              style={{ width: LEFT_PANEL_WIDTH }}
            >
              <div className="h-12 border-b border-border flex items-center px-3 bg-background">
                <span className="text-xs font-medium text-muted-foreground">행</span>
              </div>

              <div style={{ height: contentHeight }}>
                {lanes.map((lane, laneIdx) => {
                  const schedules = laneSchedules.get(lane.id) ?? [];
                  const isEditingThis = editingLaneId === lane.id;
                  return (
                    <LaneRow
                      key={lane.id}
                      laneId={lane.id}
                      title={lane.title}
                      localIndex={laneIdx}
                      scheduleCount={schedules.length}
                      isHovered={hoverCell?.row === laneIdx}
                      isEditing={isEditingThis}
                      editingTitle={isEditingThis ? editingLaneTitle : ""}
                      isDragging={!!(laneDrag?.moved && laneDrag.laneId === lane.id)}
                      showDropBefore={!!(laneDrag?.moved && laneDropLocal === laneIdx && laneDropLocal < laneDrag.fromLocal)}
                      showDropAfter={!!(laneDrag?.moved && laneDropLocal === laneIdx && laneDropLocal > laneDrag.fromLocal)}
                      onEditingTitleChange={setEditingLaneTitle}
                      onStartEdit={startEdit}
                      onSaveEdit={saveEdit}
                      onCancelEdit={cancelEdit}
                      onDelete={laneDelete}
                      onAddBelow={handleLaneAddBelow}
                      onPointerDown={handleLanePointerDown}
                      className="px-1"
                    />
                  );
                })}

                {lanes.length === 0 && (
                  <div className="flex items-center justify-center" style={{ height: ROW_HEIGHT }}>
                    <span className="text-[10px] text-muted-foreground/50">행 없음</span>
                  </div>
                )}
              </div>
            </div>

            {/* 우측 간트 */}
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
                {lanes.map((lane, laneIdx) => {
                  const schedules = laneSchedules.get(lane.id) ?? [];
                  return schedules.map((schedule) => (
                    <GanttBar
                      key={schedule.id}
                      schedule={schedule}
                      rowIndex={laneIdx}
                      rangeStart={range.start}
                      totalRows={lanes.length}
                      onDateChange={handleDateChange}
                      onRowChange={handleRowChange}
                      onBarClick={handleBarClick}
                      onDuplicate={handleDuplicate}
                    />
                  ));
                })}

                {items.length === 0 && lanes.length > 0 && !createState && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <span className="text-xs text-muted-foreground/60">
                      간트 영역을 클릭하여 일정을 추가하세요
                    </span>
                  </div>
                )}

                {createState && (
                  <GhostBar
                    startDate={createState.startDate}
                    endDate={createState.endDate}
                    rowIndex={createState.rowIndex}
                    rangeStart={range.start}
                  />
                )}
              </GanttGrid>
            </div>
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
