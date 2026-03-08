import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { ChevronRightIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Container } from "@/shared/ui/container";
import { Separator } from "@/shared/ui/separator";
import { SidebarTrigger } from "@/shared/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { TASK_CATEGORIES } from "@packages/schemas";
import {
  useProjectScheduleOverview,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
  useReorderProjects,
  useReorderLanes,
} from "../api";
import { PRESET_COLORS } from "../constants";
import type { ProjectScheduleDTO, LaneWithSchedules, OverviewProject } from "../types";
import {
  computeOverviewRange,
  getTotalWidth,
  dateToX,
  parseISO,
  differenceInCalendarDays,
  format,
  DAY_WIDTH,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
  LEFT_PANEL_WIDTH,
  CLICK_THRESHOLD,
} from "./utils";
import { useScrollToToday } from "./use-scroll-to-today";
import { useLaneActions } from "./use-lane-actions";
import { TimelineHeader } from "./timeline-header";
import { GanttGrid } from "./gantt-grid";
import { GanttBar } from "./gantt-bar";
import { GhostBar } from "./ghost-bar";
import { LaneRow } from "./lane-row";
import { SchedulePopover } from "./schedule-popover";
import { StatusBadge } from "../../projects/status-badge";

export function ProjectScheduleOverview() {
  const [status, setStatus] = useState<"active" | "completed">("active");
  const { data } = useProjectScheduleOverview(status);
  const projects = data?.items ?? [];

  return (
    <div className="flex flex-col h-dvh">
      <header className="border-b bg-background rounded-t-xl py-1.5 md:py-4">
        <Container className="grid gap-3 px-1.5 md:px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mx-2 hidden md:block" />
            <h1 className="text-xl font-semibold hidden md:block">프로젝트 일정</h1>
            <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mx-2 hidden md:block" />

            <Tabs value={status} onValueChange={(v) => setStatus(v as "active" | "completed")}>
              <TabsList>
                <TabsTrigger value="active">진행중</TabsTrigger>
                <TabsTrigger value="completed">완료</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* 카테고리 범례 */}
            <div className="hidden md:flex items-center gap-3 ml-auto">
                {TASK_CATEGORIES.map((cat) => {
                  const config = PRESET_COLORS[cat];
                  return (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="text-xs text-muted-foreground">{config.label}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </Container>
      </header>

      {projects.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {status === "active" ? "진행중인 프로젝트가 없습니다." : "완료된 프로젝트가 없습니다."}
        </div>
      ) : (
        <OverviewGantt key={status} projects={projects} defaultExpanded={status === "active"} />
      )}
    </div>
  );
}

// ── 오버뷰 간트 본체 ──────────────────────────────────────────

type OverviewRow =
  | { type: "project"; project: OverviewProject; globalRow: number }
  | { type: "lane"; project: OverviewProject; lane: LaneWithSchedules; localIndex: number; globalRow: number }
  | { type: "empty"; project: OverviewProject; globalRow: number };

function OverviewGantt({ projects, defaultExpanded }: { projects: OverviewProject[]; defaultExpanded?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => defaultExpanded ? new Set(projects.map((p) => p.id)) : new Set()
  );

  const createSchedule = useCreateProjectSchedule();
  const updateSchedule = useUpdateProjectSchedule();
  const reorderProjects = useReorderProjects();
  const reorderLanes = useReorderLanes();
  const {
    editingLaneId, editingLaneTitle, setEditingLaneTitle,
    startEdit, saveEdit, cancelEdit,
    handleDelete: laneDelete, handleAddBelow: laneAddBelow,
  } = useLaneActions();

  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);
  const [popover, setPopover] = useState<{ schedule: ProjectScheduleDTO; rect: DOMRect } | null>(null);
  const [createState, setCreateState] = useState<{
    projectId: string;
    laneId: string;
    startDate: string;
    endDate?: string;
    rowIndex: number;
    anchorRect: DOMRect;
  } | null>(null);
  const [projectDrag, setProjectDrag] = useState<{
    projectId: string;
    startY: number;
    currentY: number;
    fromIndex: number;
    moved: boolean;
  } | null>(null);
  const projectDragRef = useRef(projectDrag);
  projectDragRef.current = projectDrag;

  // 레인 드래그 (overview는 projectId도 추적해야 하므로 직접 관리)
  const [laneDrag, setLaneDrag] = useState<{
    laneId: string;
    projectId: string;
    startY: number;
    currentY: number;
    fromLocal: number;
    moved: boolean;
  } | null>(null);
  const laneDragRef = useRef(laneDrag);
  laneDragRef.current = laneDrag;

  const overviewProjects = useMemo(() =>
    projects.map((p) => ({
      contractDate: p.contractDate,
      deliveredDate: p.deliveredDate,
      completedDate: p.completedDate,
      schedules: p.lanes.flatMap((l) => l.schedules),
    })),
    [projects]
  );

  const range = useMemo(() => computeOverviewRange(overviewProjects), [overviewProjects]);
  const totalWidth = useMemo(() => getTotalWidth(range.start, range.end), [range]);

  useScrollToToday(scrollRef, range.start);

  // 행 구조 계산
  const rows = useMemo(() => {
    const result: OverviewRow[] = [];
    let row = 0;
    for (const p of projects) {
      result.push({ type: "project", project: p, globalRow: row });
      row++;
      if (expandedProjects.has(p.id)) {
        if (p.lanes.length === 0) {
          result.push({ type: "empty", project: p, globalRow: row });
          row++;
        } else {
          for (let i = 0; i < p.lanes.length; i++) {
            result.push({ type: "lane", project: p, lane: p.lanes[i], localIndex: i, globalRow: row });
            row++;
          }
        }
      }
    }
    return result;
  }, [projects, expandedProjects]);

  const totalRows = rows.length;

  // 프로젝트 행 인덱스
  const projectRowIndices = useMemo(() =>
    rows
      .map((r, i) => (r.type === "project" ? { index: i, globalRow: r.globalRow } : null))
      .filter(Boolean) as { index: number; globalRow: number }[],
    [rows]
  );

  const dropIndex = useMemo(() => {
    if (!projectDrag?.moved) return -1;
    const fromGlobalRow = projectRowIndices[projectDrag.fromIndex]?.globalRow ?? 0;
    const targetGlobalRow = fromGlobalRow + Math.round((projectDrag.currentY - projectDrag.startY) / ROW_HEIGHT);
    let closest = projectDrag.fromIndex;
    let minDist = Infinity;
    for (let i = 0; i < projectRowIndices.length; i++) {
      const dist = Math.abs(projectRowIndices[i].globalRow - targetGlobalRow);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
    return closest;
  }, [projectDrag, projectRowIndices]);

  // 프로젝트별 레인 행 범위
  const projectLaneRange = useMemo(() => {
    const rangeMap = new Map<string, { startRow: number; count: number }>();
    for (const row of rows) {
      if (row.type !== "lane") continue;
      const existing = rangeMap.get(row.project.id);
      if (!existing) {
        rangeMap.set(row.project.id, { startRow: row.globalRow, count: 1 });
      } else {
        existing.count++;
      }
    }
    return rangeMap;
  }, [rows]);

  // 레인 드래그 시 시각적 로컬 인덱스
  const laneDropLocal = useMemo(() => {
    if (!laneDrag?.moved) return -1;
    const project = projects.find((p) => p.id === laneDrag.projectId);
    if (!project) return -1;
    const delta = Math.round((laneDrag.currentY - laneDrag.startY) / ROW_HEIGHT);
    return Math.max(0, Math.min(project.lanes.length - 1, laneDrag.fromLocal + delta));
  }, [laneDrag, projects]);

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canDragRow = useCallback((rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= rows.length) return false;
    return rows[rowIndex].type === "lane";
  }, [rows]);

  const handleEmptyClick = useCallback((date: Date, rowIndex: number, anchorRect: DOMRect) => {
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    const row = rows[rowIndex];

    if (row.type === "project") {
      toggleProject(row.project.id);
      return;
    }

    if (row.type !== "lane") return;

    setPopover(null);
    setCreateState({
      projectId: row.project.id,
      laneId: row.lane.id,
      startDate: format(date, "yyyy-MM-dd"),
      rowIndex,
      anchorRect,
    });
  }, [rows]);

  const handleDragCreate = useCallback((startDate: Date, endDate: Date, rowIndex: number, anchorRect: DOMRect) => {
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    const row = rows[rowIndex];
    if (row.type !== "lane") return;

    setPopover(null);
    setCreateState({
      projectId: row.project.id,
      laneId: row.lane.id,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      rowIndex,
      anchorRect,
    });
  }, [rows]);

  const handleBarClick = useCallback((schedule: ProjectScheduleDTO, rect: DOMRect) => {
    setCreateState(null);
    setPopover({ schedule, rect });
  }, []);

  const handleDuplicate = useCallback((schedule: ProjectScheduleDTO, newStartDate: string, newEndDate: string | null) => {
    createSchedule.mutate({
      title: schedule.title,
      startDate: newStartDate,
      endDate: newEndDate,
      projectId: schedule.projectId,
      laneId: schedule.laneId,
      category: schedule.category,
      categoryColor: schedule.categoryColor,
    });
  }, [createSchedule]);

  const handleDateChange = useCallback((id: string, newStartDate: string, newEndDate: string | null) => {
    updateSchedule.mutate({ id, data: { startDate: newStartDate, endDate: newEndDate } });
  }, [updateSchedule]);

  const handleRowChange = useCallback((scheduleId: string, fromRow: number, toRow: number) => {
    if (fromRow === toRow) return;
    const toRowData = rows[toRow];
    if (toRowData?.type === "lane") {
      updateSchedule.mutate({ id: scheduleId, data: { laneId: toRowData.lane.id } });
    }
  }, [rows, updateSchedule]);

  // 레인 콜백 (안정적 참조)
  const handleLaneAddBelow = useCallback((laneId: string, localIndex: number) => {
    const row = rows.find((r) => r.type === "lane" && r.lane.id === laneId);
    if (row?.type === "lane") {
      laneAddBelow(row.project.id, localIndex, row.project.lanes);
    }
  }, [rows, laneAddBelow]);

  const handleLanePointerDown = useCallback((e: React.PointerEvent, laneId: string, localIndex: number) => {
    const row = rows.find((r) => r.type === "lane" && r.lane.id === laneId);
    if (row?.type === "lane") {
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setLaneDrag({ laneId, projectId: row.project.id, startY: e.clientY, currentY: e.clientY, fromLocal: localIndex, moved: false });
    }
  }, [rows]);

  // 프로젝트 리오더
  const handleProjectReorder = useCallback((fromIndex: number, toIndex: number) => {
    const reordered = [...projects];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    reorderProjects.mutate(reordered.map((p, i) => ({ id: p.id, sortOrder: i })));
  }, [projects, reorderProjects]);

  const handleProjectPointerDown = useCallback((e: React.PointerEvent, projectId: string, fromIndex: number) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setProjectDrag({ projectId, startY: e.clientY, currentY: e.clientY, fromIndex, moved: false });
  }, []);

  useEffect(() => {
    if (!projectDrag) return;

    const handleMove = (e: PointerEvent) => {
      setProjectDrag((prev) => {
        if (!prev) return null;
        const moved = prev.moved || Math.abs(e.clientY - prev.startY) > CLICK_THRESHOLD;
        return { ...prev, currentY: e.clientY, moved };
      });
    };

    const handleUp = () => {
      const prev = projectDragRef.current;
      if (!prev) return;

      if (prev.moved) {
        const fromGlobalRow = projectRowIndices[prev.fromIndex]?.globalRow ?? 0;
        const targetGlobalRow = fromGlobalRow + Math.round((prev.currentY - prev.startY) / ROW_HEIGHT);
        let closest = prev.fromIndex;
        let minDist = Infinity;
        for (let i = 0; i < projectRowIndices.length; i++) {
          const dist = Math.abs(projectRowIndices[i].globalRow - targetGlobalRow);
          if (dist < minDist) { minDist = dist; closest = i; }
        }
        if (closest !== prev.fromIndex) {
          handleProjectReorder(prev.fromIndex, closest);
        }
      } else {
        toggleProject(prev.projectId);
      }

      setProjectDrag(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [!!projectDrag, projectRowIndices, handleProjectReorder]);

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
        const project = projects.find((p) => p.id === prev.projectId);
        if (project) {
          const delta = Math.round((prev.currentY - prev.startY) / ROW_HEIGHT);
          const toLocal = Math.max(0, Math.min(project.lanes.length - 1, prev.fromLocal + delta));
          if (toLocal !== prev.fromLocal) {
            const reordered = [...project.lanes];
            const [moved] = reordered.splice(prev.fromLocal, 1);
            reordered.splice(toLocal, 0, moved);
            reorderLanes.mutate(reordered.map((l, i) => ({ id: l.id, sortOrder: i })));
          }
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
  }, [!!laneDrag, projects, reorderLanes]);

  const handleCreateSubmit = useCallback((title: string, category: string, categoryColor: string | null) => {
    if (!createState) return;

    createSchedule.mutate({
      title,
      startDate: createState.startDate,
      endDate: createState.endDate,
      projectId: createState.projectId,
      laneId: createState.laneId,
      category,
      categoryColor,
    });
    setCreateState(null);
  }, [createState, createSchedule]);

  // 좌측 패널 높이 동기화
  const contentHeight = Math.max(totalRows, 1) * ROW_HEIGHT;

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto border-b border-border">
      <div className="flex" style={{ width: LEFT_PANEL_WIDTH + totalWidth }}>
        {/* 좌측 고정 패널 */}
        <div
          className="sticky left-0 z-20 shrink-0 border-r border-border bg-background"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          <div className="sticky top-0 z-30 h-12 border-b border-border flex items-center justify-between px-3 bg-background">
            <span className="text-xs font-medium text-muted-foreground">프로젝트</span>
            <button
              type="button"
              className="p-1 rounded hover:bg-accent text-muted-foreground"
              onClick={() => {
                const allExpanded = projects.every((p) => expandedProjects.has(p.id));
                setExpandedProjects(allExpanded ? new Set() : new Set(projects.map((p) => p.id)));
              }}
              title={projects.every((p) => expandedProjects.has(p.id)) ? "모두 닫기" : "모두 열기"}
            >
              <ChevronsUpDownIcon className="size-3.5" />
            </button>
          </div>

          <div style={{ height: contentHeight }}>
            {rows.map((row) => {
              if (row.type === "project") {
                const isExpanded = expandedProjects.has(row.project.id);
                const projectIdx = projectRowIndices.findIndex((p) => p.globalRow === row.globalRow);
                const isDragging = projectDrag?.moved && projectDrag.fromIndex === projectIdx;
                const showDropBefore = projectDrag?.moved && dropIndex === projectIdx && dropIndex < projectDrag.fromIndex;
                const showDropAfter = projectDrag?.moved && dropIndex === projectIdx && dropIndex > projectDrag.fromIndex;
                return (
                  <div key={`p-${row.project.id}`}>
                    {showDropBefore && (
                      <div className="h-0.5 bg-primary" style={{ marginTop: -1 }} />
                    )}
                    <div
                      className={cn(
                        "sticky z-10 flex items-center gap-1 px-2 border-b border-border/30 cursor-pointer hover:bg-accent bg-background select-none",
                        hoverCell?.row === row.globalRow && "bg-accent/50",
                        isDragging && "opacity-50"
                      )}
                      style={{ height: ROW_HEIGHT, top: HEADER_HEIGHT }}
                      onPointerDown={(e) => handleProjectPointerDown(e, row.project.id, projectIdx)}
                    >
                      <ChevronRightIcon
                        className={cn(
                          "size-3.5 shrink-0 transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{row.project.name}</p>
                          <StatusBadge projectId={row.project.id} status={row.project.status as any} readonly className="text-[10px] h-4 min-w-0 px-1.5 shrink-0 ml-auto" />
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{row.project.companyName}</p>
                      </div>
                    </div>
                    {showDropAfter && (
                      <div className="h-0.5 bg-primary" style={{ marginTop: -1 }} />
                    )}
                  </div>
                );
              }

              if (row.type === "empty") {
                return (
                  <div
                    key={`empty-${row.project.id}`}
                    className={cn(
                      "flex items-center pl-6 pr-2 border-b border-border/30",
                      hoverCell?.row === row.globalRow && "bg-foreground/[0.02]"
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <span className="text-[10px] text-muted-foreground/50">행 없음</span>
                  </div>
                );
              }

              // lane row
              const isLaneDragging = !!(laneDrag?.moved && laneDrag.laneId === row.lane.id);
              const showLaneDropIndicator = !!(laneDrag?.moved
                && laneDrag.projectId === row.project.id
                && laneDropLocal === row.localIndex
                && laneDropLocal !== laneDrag.fromLocal);
              const isEditingThis = editingLaneId === row.lane.id;

              return (
                <LaneRow
                  key={`l-${row.lane.id}`}
                  laneId={row.lane.id}
                  title={row.lane.title}
                  localIndex={row.localIndex}
                  scheduleCount={row.lane.schedules.length}
                  isHovered={hoverCell?.row === row.globalRow}
                  isEditing={isEditingThis}
                  editingTitle={isEditingThis ? editingLaneTitle : ""}
                  isDragging={isLaneDragging}
                  showDropBefore={showLaneDropIndicator && laneDropLocal < laneDrag!.fromLocal}
                  showDropAfter={showLaneDropIndicator && laneDropLocal > laneDrag!.fromLocal}
                  onEditingTitleChange={setEditingLaneTitle}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onDelete={laneDelete}
                  onAddBelow={handleLaneAddBelow}
                  onPointerDown={handleLanePointerDown}
                />
              );
            })}
          </div>
        </div>

        {/* 우측 간트 */}
        <div style={{ width: totalWidth }}>
          <TimelineHeader
            rangeStart={range.start}
            rangeEnd={range.end}
            totalWidth={totalWidth}
            hoverCol={hoverCell?.col}
            stickyLeft={LEFT_PANEL_WIDTH}
          />
          <GanttGrid
            rangeStart={range.start}
            rangeEnd={range.end}
            totalWidth={totalWidth}
            rowCount={totalRows}
            onEmptyClick={handleEmptyClick}
            onDragCreate={handleDragCreate}
            canDragRow={canDragRow}
            onHoverCell={setHoverCell}
          >
            {rows.map((row) => {
              if (row.type === "project") {
                const isExpanded = expandedProjects.has(row.project.id);
                if (isExpanded) return null;
                return (
                  <SummaryBar
                    key={`summary-${row.project.id}`}
                    project={row.project}
                    rowIndex={row.globalRow}
                    rangeStart={range.start}
                  />
                );
              }

              if (row.type === "empty") return null;

              // lane row — 해당 레인의 모든 일정 렌더링
              const laneRange = projectLaneRange.get(row.project.id);
              return row.lane.schedules.map((schedule) => (
                <GanttBar
                  key={schedule.id}
                  schedule={schedule}
                  rowIndex={row.globalRow}
                  rangeStart={range.start}
                  totalRows={totalRows}
                  onDateChange={handleDateChange}
                  onRowChange={handleRowChange}
                  onBarClick={handleBarClick}
                  onDuplicate={handleDuplicate}
                  minRow={laneRange?.startRow}
                  maxRow={laneRange ? laneRange.startRow + laneRange.count - 1 : undefined}
                />
              ));
            })}

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

      {popover && (
        <SchedulePopover
          schedule={popover.schedule}
          anchorRect={popover.rect}
          containerRef={scrollRef}
          onClose={() => setPopover(null)}
        />
      )}

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
  );
}

// ── 요약 바 (접힌 프로젝트) ──────────────────────────────────

function SummaryBar({
  project,
  rowIndex,
  rangeStart,
}: {
  project: OverviewProject;
  rowIndex: number;
  rangeStart: Date;
}) {
  const allSchedules = useMemo(
    () => project.lanes.flatMap((l) => l.schedules),
    [project.lanes]
  );

  const { left, width, top } = useMemo(() => {
    if (allSchedules.length === 0) return { left: 0, width: 0, top: 0 };

    const dates: Date[] = [];
    for (const s of allSchedules) {
      dates.push(parseISO(s.startDate));
      if (s.endDate) dates.push(parseISO(s.endDate));
    }

    const timestamps = dates.map((d) => d.getTime());
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));

    const l = dateToX(minDate, rangeStart);
    const span = differenceInCalendarDays(maxDate, minDate) + 1;
    return {
      left: l,
      width: Math.max(span * DAY_WIDTH, DAY_WIDTH),
      top: rowIndex * ROW_HEIGHT + BAR_Y_OFFSET,
    };
  }, [allSchedules, rangeStart, rowIndex]);

  if (allSchedules.length === 0) return null;

  return (
    <div
      className="absolute rounded-md bg-primary/10 flex items-center px-2"
      style={{ left, width, top, height: BAR_HEIGHT }}
    >
      <span className="text-[10px] text-muted-foreground truncate">
        {allSchedules.length}개 일정
      </span>
    </div>
  );
}
