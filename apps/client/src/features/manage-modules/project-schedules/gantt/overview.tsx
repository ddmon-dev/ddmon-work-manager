import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { ChevronRightIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Container } from "@/shared/ui/container";
import { Separator } from "@/shared/ui/separator";
import { SidebarTrigger } from "@/shared/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { TASK_CATEGORIES } from "@packages/schemas";
import type { TaskCategory } from "@packages/schemas";
import {
  useProjectScheduleOverview,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
  useReorderProjectSchedules,
  useReorderProjects,
} from "../api";
import { TASK_CATEGORY_CONFIG, getCategoryConfig } from "../constants";
import type { ProjectScheduleDTO, OverviewProject } from "../types";
import {
  computeOverviewRange,
  getTotalWidth,
  dateToX,
  startOfDay,
  parseISO,
  differenceInCalendarDays,
  format,
  DAY_WIDTH,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
} from "./utils";
import { TimelineHeader } from "./timeline-header";
import { GanttGrid } from "./gantt-grid";
import { GanttBar } from "./gantt-bar";
import { SchedulePopover } from "./schedule-popover";

export function ProjectScheduleOverview() {
  const [status, setStatus] = useState("active");
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

            <div className="flex items-center gap-2 ml-auto">
              <Tabs value={status} onValueChange={setStatus}>
                <TabsList>
                  <TabsTrigger value="active">진행중</TabsTrigger>
                  <TabsTrigger value="completed">완료</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* 카테고리 범례 */}
              <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mx-1 hidden md:block" />
              <div className="hidden md:flex items-center gap-3">
                {TASK_CATEGORIES.map((cat) => {
                  const config = TASK_CATEGORY_CONFIG[cat];
                  return (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span className={cn("size-2.5 rounded-full", config.dot)} />
                      <span className="text-xs text-muted-foreground">{config.label}</span>
                    </div>
                  );
                })}
              </div>
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

const LEFT_PANEL_WIDTH = 220;

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

type OverviewRow =
  | { type: "project"; project: OverviewProject; globalRow: number }
  | { type: "schedule"; project: OverviewProject; schedules: ProjectScheduleDTO[]; localIndex: number; globalRow: number }
  | { type: "empty"; project: OverviewProject; globalRow: number };

const CLICK_THRESHOLD = 4;

function OverviewGantt({ projects, defaultExpanded }: { projects: OverviewProject[]; defaultExpanded?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => defaultExpanded ? new Set(projects.map((p) => p.id)) : new Set()
  );

  const createSchedule = useCreateProjectSchedule();
  const updateSchedule = useUpdateProjectSchedule();
  const reorderSchedules = useReorderProjectSchedules();
  const reorderProjects = useReorderProjects();

  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);
  const [popover, setPopover] = useState<{ schedule: ProjectScheduleDTO; rect: DOMRect } | null>(null);
  const [createState, setCreateState] = useState<{
    projectId: string;
    startDate: string;
    endDate?: string;
    rowIndex: number;
    insertIndex: number;
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

  const [dragReorder, setDragReorder] = useState<{
    projectId: string;
    fromLocal: number;
    toLocal: number;
  } | null>(null);

  const range = useMemo(() => computeOverviewRange(projects), [projects]);
  const totalWidth = useMemo(() => getTotalWidth(range.start, range.end), [range]);

  // 행 구조 계산
  const rows = useMemo(() => {
    const result: OverviewRow[] = [];
    let row = 0;
    for (const p of projects) {
      result.push({ type: "project", project: p, globalRow: row });
      row++;
      if (expandedProjects.has(p.id)) {
        if (p.schedules.length === 0) {
          result.push({ type: "empty", project: p, globalRow: row });
          row++;
        } else {
          const groups = groupSchedules(p.schedules);
          for (let i = 0; i < groups.length; i++) {
            result.push({ type: "schedule", project: p, schedules: groups[i], localIndex: i, globalRow: row });
            row++;
          }
        }
      }
    }
    return result;
  }, [projects, expandedProjects]);

  const totalRows = rows.length;

  // 프로젝트 행 인덱스 (드래그 드롭 계산용)
  const projectRowIndices = useMemo(() =>
    rows
      .map((r, i) => (r.type === "project" ? { index: i, globalRow: r.globalRow, projectIndex: -1 } : null))
      .filter(Boolean) as { index: number; globalRow: number; projectIndex: number }[],
    [rows]
  );
  // projectIndex 채우기 (projects 배열 내 인덱스)
  useMemo(() => {
    projectRowIndices.forEach((item, i) => { item.projectIndex = i; });
  }, [projectRowIndices]);

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

  // 프로젝트별 일정 행 범위 계산
  const projectScheduleRange = useMemo(() => {
    const rangeMap = new Map<string, { startRow: number; count: number }>();
    for (const row of rows) {
      if (row.type !== "schedule") continue;
      const existing = rangeMap.get(row.project.id);
      if (!existing) {
        rangeMap.set(row.project.id, { startRow: row.globalRow, count: 1 });
      } else {
        existing.count++;
      }
    }
    return rangeMap;
  }, [rows]);

  // 리오더 시 시각적 행 위치 계산
  const getVisualRow = useCallback(
    (projectId: string, localIndex: number, globalRow: number): number => {
      if (!dragReorder || dragReorder.projectId !== projectId) return globalRow;

      const range = projectScheduleRange.get(projectId);
      if (!range) return globalRow;

      const { fromLocal, toLocal } = dragReorder;
      if (localIndex === fromLocal) return globalRow;

      let visualLocal = localIndex;
      if (fromLocal < toLocal) {
        if (localIndex > fromLocal && localIndex <= toLocal) visualLocal = localIndex - 1;
      } else {
        if (localIndex >= toLocal && localIndex < fromLocal) visualLocal = localIndex + 1;
      }

      return range.startRow + visualLocal;
    },
    [dragReorder, projectScheduleRange]
  );

  // 초기 스크롤
  const didScroll = useRef(false);
  useEffect(() => {
    if (didScroll.current || !scrollRef.current) return;
    didScroll.current = true;
    const todayX = dateToX(startOfDay(new Date()), range.start);
    const containerWidth = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = Math.max(0, todayX - containerWidth / 3);
  }, [range.start]);

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
    return rows[rowIndex].type !== "project";
  }, [rows]);

  const handleEmptyClick = useCallback((date: Date, rowIndex: number, anchorRect: DOMRect) => {
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    const row = rows[rowIndex];

    if (row.type === "project") {
      toggleProject(row.project.id);
      return;
    }

    let insertIndex = 0;
    if (row.type === "schedule") {
      const last = row.schedules[row.schedules.length - 1];
      const flatIdx = row.project.schedules.findIndex((s) => s.id === last.id);
      insertIndex = flatIdx + 1;
    }
    setPopover(null);
    setCreateState({
      projectId: row.project.id,
      startDate: format(date, "yyyy-MM-dd"),
      rowIndex,
      insertIndex,
      anchorRect,
    });
  }, [rows]);

  const handleDragCreate = useCallback((startDate: Date, endDate: Date, rowIndex: number, anchorRect: DOMRect) => {
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    const row = rows[rowIndex];
    if (row.type === "project") return;

    let insertIndex = 0;
    if (row.type === "schedule") {
      const last = row.schedules[row.schedules.length - 1];
      const flatIdx = row.project.schedules.findIndex((s) => s.id === last.id);
      insertIndex = flatIdx + 1;
    }
    setPopover(null);
    setCreateState({
      projectId: row.project.id,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      rowIndex,
      insertIndex,
      anchorRect,
    });
  }, [rows]);

  const handleBarClick = useCallback((schedule: ProjectScheduleDTO, rect: DOMRect) => {
    setCreateState(null);
    setPopover({ schedule, rect });
  }, []);

  const handleDateChange = (id: string, newStartDate: string, newEndDate: string | null) => {
    updateSchedule.mutate({ id, data: { startDate: newStartDate, endDate: newEndDate } });
  };

  const handleRowChange = useCallback(
    (fromGlobalRow: number, toGlobalRow: number) => {
      for (const [projectId, range] of projectScheduleRange) {
        const fromLocal = fromGlobalRow - range.startRow;
        if (fromLocal < 0 || fromLocal >= range.count) continue;

        const toLocal = Math.max(0, Math.min(range.count - 1, toGlobalRow - range.startRow));
        if (fromLocal === toLocal) return;

        const project = projects.find((p) => p.id === projectId);
        if (!project) return;

        const groups = groupSchedules(project.schedules);
        const reordered = [...groups];
        const [moved] = reordered.splice(fromLocal, 1);
        reordered.splice(toLocal, 0, moved);

        const flat = reordered.flat();
        reorderSchedules.mutate(
          flat.map((item, i) => ({ id: item.id, sortOrder: i }))
        );
        return;
      }
    },
    [projectScheduleRange, projects, reorderSchedules]
  );

  const handleDragRow = useCallback(
    (scheduleId: string, targetGlobalRow: number) => {
      const scheduleRow = rows.find(
        (r) => r.type === "schedule" && r.schedules.some((s) => s.id === scheduleId)
      ) as Extract<OverviewRow, { type: "schedule" }> | undefined;
      if (!scheduleRow) return;

      const projectId = scheduleRow.project.id;
      const range = projectScheduleRange.get(projectId);
      if (!range) return;

      const toLocal = Math.max(0, Math.min(range.count - 1, targetGlobalRow - range.startRow));
      setDragReorder({ projectId, fromLocal: scheduleRow.localIndex, toLocal });
    },
    [rows, projectScheduleRange]
  );

  const handleDragEnd = useCallback(() => {
    setDragReorder(null);
  }, []);

  // 프로젝트 리오더
  const handleProjectReorder = useCallback((fromIndex: number, toIndex: number) => {
    const reordered = [...projects];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    reorderProjects.mutate(reordered.map((p, i) => ({ id: p.id, sortOrder: i })));
  }, [projects, reorderProjects]);

  // 프로젝트 행 포인터 이벤트
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
  }, [projectDrag, projectRowIndices, handleProjectReorder]);

  const handleCreateSubmit = useCallback((title: string, category: TaskCategory) => {
    if (!createState) return;
    const project = projects.find((p) => p.id === createState.projectId);
    if (!project) return;

    createSchedule.mutate({
      title,
      startDate: createState.startDate,
      endDate: createState.endDate,
      projectId: createState.projectId,
      category,
      sortOrder: createState.insertIndex,
    }, {
      onSuccess: () => {
        const newList = [...project.schedules];
        // insertIndex 이후의 기존 항목들 sortOrder 밀기
        const reorderItems = newList
          .filter((_, i) => i >= createState.insertIndex)
          .map((item, i) => ({ id: item.id, sortOrder: createState.insertIndex + 1 + i }));
        if (reorderItems.length > 0) {
          reorderSchedules.mutate(reorderItems);
        }
      },
    });
    setCreateState(null);
  }, [createState, projects, createSchedule, reorderSchedules]);

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
          {/* 헤더 — 가로+세로 모두 고정 */}
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

          {/* 행 목록 */}
          <div style={{ height: contentHeight }}>
            {rows.map((row, rowIdx) => {
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
                        <p className="text-xs font-medium truncate">{row.project.name}</p>
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
                      "flex items-center pl-7 pr-2 border-b border-border/30",
                      hoverCell?.row === row.globalRow && "bg-foreground/[0.02]"
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <span className="text-[10px] text-muted-foreground/50">일정 없음</span>
                  </div>
                );
              }

              // schedule row
              const config = getCategoryConfig(row.schedules[0].category);
              return (
                <div
                  key={`s-${row.schedules[0].id}`}
                  className={cn(
                    "flex items-center gap-1.5 pl-7 pr-2 border-b border-border/30",
                    hoverCell?.row === row.globalRow && "bg-foreground/[0.02]"
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className={cn("size-2 rounded-full shrink-0", config.dot)} />
                  <span className="text-xs truncate text-muted-foreground">{row.schedules[0].title}</span>
                </div>
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

              // schedule bar(s) — 같은 그룹은 같은 행에 렌더링
              const projectRange = projectScheduleRange.get(row.project.id);
              const visualRow = getVisualRow(row.project.id, row.localIndex, row.globalRow);

              return row.schedules.map((schedule) => (
                <GanttBar
                  key={schedule.id}
                  schedule={schedule}
                  rowIndex={visualRow}
                  rangeStart={range.start}
                  totalRows={totalRows}
                  onDateChange={handleDateChange}
                  onRowChange={handleRowChange}
                  onBarClick={handleBarClick}
                  onDragRow={(targetRow) => handleDragRow(schedule.id, targetRow)}
                  onDragEnd={handleDragEnd}
                  minRow={projectRange?.startRow}
                  maxRow={projectRange ? projectRange.startRow + projectRange.count - 1 : undefined}
                />
              ));
            })}

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
  if (project.schedules.length === 0) return null;

  const dates: Date[] = [];
  for (const s of project.schedules) {
    dates.push(parseISO(s.startDate));
    if (s.endDate) dates.push(parseISO(s.endDate));
  }

  const timestamps = dates.map((d) => d.getTime());
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  const left = dateToX(minDate, rangeStart);
  const span = differenceInCalendarDays(maxDate, minDate) + 1;
  const width = Math.max(span * DAY_WIDTH, DAY_WIDTH);
  const top = rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;

  return (
    <div
      className="absolute rounded-md bg-primary/10 flex items-center px-2"
      style={{ left, width, top, height: BAR_HEIGHT }}
    >
      <span className="text-[10px] text-muted-foreground truncate">
        {project.schedules.length}개 일정
      </span>
    </div>
  );
}
