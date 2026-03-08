import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { useDialog } from "@/shared/ui/app-dialog";
import { DetailSectionTitle } from "../../_base/ui";
import {
  useProjectScheduleList,
  useLaneList,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
  useReorderProjectSchedules,
  useCreateLane,
  useUpdateLane,
  useDeleteLane,
  useReorderLanes,
} from "../api";
import type { ProjectScheduleDTO, ProjectScheduleLaneDTO } from "../types";
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

const LEFT_PANEL_WIDTH = 220;
const CLICK_THRESHOLD = 4;

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
  const reorderSchedules = useReorderProjectSchedules();
  const createLane = useCreateLane();
  const updateLane = useUpdateLane();
  const deleteLane = useDeleteLane();
  const reorderLanes = useReorderLanes();
  const dialog = useDialog();

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
  const [editingLaneId, setEditingLaneId] = useState<string | null>(null);
  const [editingLaneTitle, setEditingLaneTitle] = useState("");

  // 행 드래그 리오더
  const [laneDrag, setLaneDrag] = useState<{
    laneId: string;
    startY: number;
    currentY: number;
    fromLocal: number;
    moved: boolean;
  } | null>(null);
  const laneDragRef = useRef(laneDrag);
  laneDragRef.current = laneDrag;

  const laneDropLocal = useMemo(() => {
    if (!laneDrag?.moved) return -1;
    const delta = Math.round((laneDrag.currentY - laneDrag.startY) / ROW_HEIGHT);
    return Math.max(0, Math.min(lanes.length - 1, laneDrag.fromLocal + delta));
  }, [laneDrag, lanes.length]);

  const didScroll = useRef(false);
  useEffect(() => {
    if (didScroll.current || !scrollRef.current) return;
    didScroll.current = true;
    const todayX = dateToX(startOfDay(new Date()), range.start);
    const containerWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 3);
  }, [range.start]);

  const handleEmptyClick = (date: Date, rowIndex: number, anchorRect: DOMRect) => {
    if (rowIndex < 0 || rowIndex >= lanes.length) return;
    const lane = lanes[rowIndex];
    setPopover(null);
    setCreateState({
      laneId: lane.id,
      startDate: format(date, "yyyy-MM-dd"),
      rowIndex,
      anchorRect,
    });
  };

  const handleDragCreate = (startDate: Date, endDate: Date, rowIndex: number, anchorRect: DOMRect) => {
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
  };

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

  const handleLaneEdit = (lane: ProjectScheduleLaneDTO) => {
    setEditingLaneId(lane.id);
    setEditingLaneTitle(lane.title);
  };

  const handleLaneEditSave = (laneId: string) => {
    const trimmed = editingLaneTitle.trim();
    const lane = lanes.find((l) => l.id === laneId);
    if (lane && trimmed !== lane.title) {
      updateLane.mutate({ id: laneId, data: { title: trimmed } });
    }
    setEditingLaneId(null);
  };

  const handleLaneDelete = (lane: ProjectScheduleLaneDTO) => {
    const schedules = laneSchedules.get(lane.id) ?? [];
    if (schedules.length > 0) {
      dialog.confirm({
        title: "행 삭제",
        description: `이 행에 ${schedules.length}개의 일정이 있습니다. 행과 함께 모든 일정이 삭제됩니다.`,
        variant: "destructive",
        confirmText: "삭제",
        onConfirm: () => deleteLane.mutate(lane.id),
      });
    } else {
      deleteLane.mutate(lane.id);
    }
  };

  const handleAddLaneBelow = useCallback((afterIndex: number) => {
    createLane.mutate({
      projectId,
      title: "",
      sortOrder: afterIndex + 1,
    }, {
      onSuccess: () => {
        const toReorder = lanes
          .filter((_, i) => i > afterIndex)
          .map((l, i) => ({ id: l.id, sortOrder: afterIndex + 2 + i }));
        if (toReorder.length > 0) {
          reorderLanes.mutate(toReorder);
        }
      },
    });
  }, [projectId, lanes, createLane, reorderLanes]);

  // 행 드래그 리오더
  const handleLanePointerDown = useCallback((e: React.PointerEvent, laneId: string, fromLocal: number) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setLaneDrag({ laneId, startY: e.clientY, currentY: e.clientY, fromLocal, moved: false });
  }, []);

  useEffect(() => {
    if (!laneDrag) return;

    const handleMove = (e: PointerEvent) => {
      setLaneDrag((prev) => {
        if (!prev) return null;
        const moved = prev.moved || Math.abs(e.clientY - prev.startY) > CLICK_THRESHOLD;
        return { ...prev, currentY: e.clientY, moved };
      });
    };

    const handleUp = () => {
      const prev = laneDragRef.current;
      if (!prev) return;

      if (prev.moved) {
        const delta = Math.round((prev.currentY - prev.startY) / ROW_HEIGHT);
        const toLocal = Math.max(0, Math.min(lanes.length - 1, prev.fromLocal + delta));
        if (toLocal !== prev.fromLocal) {
          const reordered = [...lanes];
          const [moved] = reordered.splice(prev.fromLocal, 1);
          reordered.splice(toLocal, 0, moved);
          reorderLanes.mutate(reordered.map((l, i) => ({ id: l.id, sortOrder: i })));
        }
      }

      setLaneDrag(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [laneDrag, lanes, reorderLanes]);

  // lanes가 행 — 최소 1행 (빈 영역 포함)
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
              {/* 헤더 */}
              <div className="h-12 border-b border-border flex items-center px-3 bg-background">
                <span className="text-xs font-medium text-muted-foreground">행</span>
              </div>

              {/* 행 목록 */}
              <div style={{ height: contentHeight }}>
                {lanes.map((lane, laneIdx) => {
                  const isLaneDragging = laneDrag?.moved && laneDrag.laneId === lane.id;
                  const showDropIndicator = laneDrag?.moved
                    && laneDropLocal === laneIdx
                    && laneDropLocal !== laneDrag!.fromLocal;

                  return (
                    <div key={lane.id} className="relative">
                      {showDropIndicator && laneDropLocal < laneDrag!.fromLocal && (
                        <div className="absolute top-0 left-3 right-1 h-0.5 bg-primary z-10" />
                      )}
                      <div
                        className={cn(
                          "group flex items-center gap-1 px-1 pr-1 border-b border-border/30",
                          hoverCell?.row === laneIdx && "bg-foreground/[0.02]",
                          isLaneDragging && "opacity-50"
                        )}
                        style={{ height: ROW_HEIGHT }}
                      >
                        <div
                          className="shrink-0 cursor-grab p-0.5 touch-none"
                          onPointerDown={(e) => handleLanePointerDown(e, lane.id, laneIdx)}
                        >
                          <GripVerticalIcon className="size-3 text-muted-foreground" />
                        </div>
                        {editingLaneId === lane.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingLaneTitle}
                            onChange={(e) => setEditingLaneTitle(e.target.value)}
                            onBlur={() => handleLaneEditSave(lane.id)}
                            onKeyDown={(e) => {
                              if (e.nativeEvent.isComposing) return;
                              if (e.key === "Enter") handleLaneEditSave(lane.id);
                              if (e.key === "Escape") setEditingLaneId(null);
                            }}
                            className="flex-1 min-w-0 text-xs px-1 py-0.5 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        ) : (
                          <span
                            className="flex-1 min-w-0 text-xs truncate text-muted-foreground cursor-text hover:text-foreground"
                            onClick={() => handleLaneEdit(lane)}
                          >
                            {lane.title || "제목 없음"}
                          </span>
                        )}
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-opacity shrink-0"
                          onClick={() => handleLaneDelete(lane)}
                        >
                          <Trash2Icon className="size-3 text-destructive" />
                        </button>
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-opacity shrink-0"
                          title="아래에 행 추가"
                          onClick={() => handleAddLaneBelow(laneIdx)}
                        >
                          <PlusIcon className="size-3 text-muted-foreground" />
                        </button>
                      </div>
                      {showDropIndicator && laneDropLocal > laneDrag!.fromLocal && (
                        <div className="absolute bottom-0 left-3 right-1 h-0.5 bg-primary z-10" />
                      )}
                    </div>
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
                      onRowChange={(fromRow, toRow) => {
                        // Y축 드래그: 다른 행으로 이동
                        if (fromRow !== toRow && toRow >= 0 && toRow < lanes.length) {
                          updateSchedule.mutate({
                            id: schedule.id,
                            data: { laneId: lanes[toRow].id },
                          });
                        }
                      }}
                      onBarClick={handleBarClick}
                      onDuplicate={handleDuplicate}
                    />
                  ));
                })}

                {/* 빈 상태 안내 */}
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

                {/* 고스트 바 */}
                {createState && (() => {
                  const ghostLeft = dateToX(parseISO(createState.startDate), range.start);
                  const days = createState.endDate
                    ? differenceInCalendarDays(parseISO(createState.endDate), parseISO(createState.startDate)) + 1
                    : 1;
                  const ghostWidth = Math.max(days * DAY_WIDTH, DAY_WIDTH);
                  const ghostTop = createState.rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;
                  return (
                    <div
                      data-gantt-bar
                      className="absolute rounded-md bg-primary/20 border border-primary/40 z-20"
                      style={{ left: ghostLeft, width: ghostWidth, top: ghostTop, height: BAR_HEIGHT }}
                    />
                  );
                })()}
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
