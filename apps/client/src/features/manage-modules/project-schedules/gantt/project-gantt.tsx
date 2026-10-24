import { useRef, useCallback, useState, useMemo, useEffect } from "react";
import { DetailSectionTitle } from "../../_base/ui";
import {
  useProjectScheduleList,
  useLaneList,
  useReorderLanes,
} from "../api";
import type { ProjectScheduleDTO, ProjectScheduleLaneDTO } from "../types";
import { useGantt } from "./use-gantt";
import { useScrollToToday } from "./use-scroll-to-today";
import { useLaneDrag } from "./use-lane-drag";
import { useLaneActions } from "./use-lane-actions";
import { useGanttActions } from "./use-gantt-actions";
import { TimelineHeader } from "./timeline-header";
import { GanttGrid } from "./gantt-grid";
import { GanttBar } from "./gantt-bar";
import { GhostBar } from "./ghost-bar";
import { LaneRow } from "./lane-row";
import { SchedulePopover } from "./schedule-popover";
import { GanttSkeleton } from "./gantt-skeleton";
import { QueryError } from "@/shared/ui/query-error";
import { ROW_HEIGHT } from "./utils";

/** 프로젝트 상세 시트에서는 좁은 lane 너비 사용 (overview는 utils의 150px) */
const LANE_COL_WIDTH = 120;

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
  const { data: scheduleData, isLoading: schedulesLoading, error: schedulesError, refetch: refetchSchedules } = useProjectScheduleList(projectId);
  const { data: laneData, isLoading: lanesLoading, error: lanesError, refetch: refetchLanes } = useLaneList(projectId);
  const error = schedulesError || lanesError;
  const hasData = !!scheduleData && !!laneData;
  const retry = () => { void refetchSchedules(); void refetchLanes(); };
  const items = scheduleData?.items ?? [];
  const [lanes, setLanes] = useState<ProjectScheduleLaneDTO[]>([]);
  const isLoading = schedulesLoading || lanesLoading || (!lanes.length && !!laneData?.items.length);
  useEffect(() => { if (laneData?.items) setLanes(laneData.items); }, [laneData?.items]);

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

  const { range, totalWidth } = useGantt({
    schedules: items,
    contractDate,
    deliveredDate,
    completedDate,
  });

  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);

  // 공유 훅
  useScrollToToday(scrollRef, range.start, !isLoading && hasData);

  const reorderLanes = useReorderLanes();
  const {
    editingLaneId, editingLaneTitle, setEditingLaneTitle,
    startEdit, saveEdit, cancelEdit,
    handleDelete: laneDelete, handleAddBelow: laneAddBelow,
  } = useLaneActions();

  const handleLaneReorder = useCallback((fromLocal: number, toLocal: number) => {
    setLanes((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(fromLocal, 1);
      reordered.splice(toLocal, 0, moved);
      reorderLanes.mutate(reordered.map((l, i) => ({ id: l.id, sortOrder: i })));
      return reordered;
    });
  }, [reorderLanes]);

  const { laneDrag, laneDropLocal, handleLanePointerDown } = useLaneDrag({
    laneCount: lanes.length,
    onReorder: handleLaneReorder,
  });

  // 간트 액션 훅
  const resolveLane = useCallback((rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= lanes.length) return null;
    return { laneId: lanes[rowIndex].id, projectId };
  }, [lanes, projectId]);

  const {
    popover, setPopover,
    createState, setCreateState,
    handleEmptyClick, handleDragCreate,
    handleBarClick, handleDuplicate,
    handleDateChange, handleRowChange,
    handleCreateSubmit,
  } = useGanttActions({ resolveLane });

  const handleLaneAddBelow = useCallback((_laneId: string, localIndex: number) => {
    laneAddBelow(projectId, localIndex, lanes);
  }, [projectId, lanes, laneAddBelow]);

  const rowCount = Math.max(lanes.length, 1);
  const contentHeight = rowCount * ROW_HEIGHT;

  if (isLoading || (error && !hasData)) {
    return (
      <div>
        <DetailSectionTitle>일정</DetailSectionTitle>
        {isLoading ? <div className="overflow-hidden rounded-lg border"><GanttSkeleton compact rows={Math.max(laneData?.items.length ?? 3, 1)} /></div> : <QueryError onRetry={retry} message="프로젝트 일정을 불러오지 못했습니다." />}
      </div>
    );
  }

  return (
    <div>
      <DetailSectionTitle>일정</DetailSectionTitle>
      {error && <QueryError floating onRetry={retry} />}

      <div className="rounded-lg border border-border overflow-hidden">
        <div
          ref={scrollRef}
          className="overflow-auto hide-scrollbar"
        >
          <div className="flex" style={{ width: LANE_COL_WIDTH + totalWidth }}>
            {/* 좌측 고정 패널 */}
            <div
              className="sticky left-0 z-30 shrink-0 border-r border-border bg-background"
              style={{ width: LANE_COL_WIDTH }}
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
                      isLast={laneIdx === lanes.length - 1}
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
                hoverCell={hoverCell}
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
