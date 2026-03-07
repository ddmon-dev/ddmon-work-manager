import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { TASK_CATEGORIES } from "@packages/schemas";
import type { TaskCategory } from "@packages/schemas";
import {
  useProjectScheduleOverview,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
  useReorderProjectSchedules,
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
  BAR_HEIGHT,
  BAR_Y_OFFSET,
} from "./utils";
import { TimelineHeader } from "./timeline-header";
import { GanttGrid } from "./gantt-grid";
import { GanttBar } from "./gantt-bar";
import { BarPopover } from "./bar-popover";
import { InlineCreateRow } from "./inline-create-row";

export function ProjectScheduleOverview() {
  const [status, setStatus] = useState("active");
  const { data } = useProjectScheduleOverview(status);
  const projects = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">프로젝트 일정</h1>
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList>
              <TabsTrigger value="active">진행중</TabsTrigger>
              <TabsTrigger value="completed">완료</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 카테고리 범례 */}
        <div className="flex items-center gap-3">
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

      {projects.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {status === "active" ? "진행중인 프로젝트가 없습니다." : "완료된 프로젝트가 없습니다."}
        </div>
      ) : (
        <OverviewGantt projects={projects} />
      )}
    </div>
  );
}

// ── 오버뷰 간트 본체 ──────────────────────────────────────────

const LEFT_PANEL_WIDTH = 220;

type OverviewRow =
  | { type: "project"; project: OverviewProject; globalRow: number }
  | { type: "schedule"; project: OverviewProject; schedule: ProjectScheduleDTO; localIndex: number; globalRow: number }
  | { type: "add-schedule"; projectId: string; globalRow: number };

function OverviewGantt({ projects }: { projects: OverviewProject[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const createSchedule = useCreateProjectSchedule();
  const updateSchedule = useUpdateProjectSchedule();
  const reorderSchedules = useReorderProjectSchedules();

  const [popover, setPopover] = useState<{ schedule: ProjectScheduleDTO; rect: DOMRect } | null>(null);
  const [inlineCreate, setInlineCreate] = useState<{ projectId: string; date: string; endDate?: string } | null>(null);
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
        for (let i = 0; i < p.schedules.length; i++) {
          result.push({ type: "schedule", project: p, schedule: p.schedules[i], localIndex: i, globalRow: row });
          row++;
        }
        // add-schedule 행은 항상 유지 (인라인 생성 시 같은 행에서 폼으로 변환)
        result.push({ type: "add-schedule", projectId: p.id, globalRow: row });
        row++;
      }
    }
    return result;
  }, [projects, expandedProjects, inlineCreate]);

  const totalRows = rows.length;

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
      if (localIndex === fromLocal) return globalRow; // 드래그 중인 항목은 preview.top이 처리

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

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEmptyClick = useCallback((date: Date, rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    const row = rows[rowIndex];
    const targetProjectId = row.type === "add-schedule" ? row.projectId : row.type === "project" ? row.project.id : row.project.id;

    if (!expandedProjects.has(targetProjectId)) {
      setExpandedProjects((prev) => new Set(prev).add(targetProjectId));
    }
    setInlineCreate({ projectId: targetProjectId, date: format(date, "yyyy-MM-dd") });
  }, [rows, expandedProjects]);

  const handleDragCreate = useCallback((startDate: Date, endDate: Date, rowIndex: number) => {
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    const row = rows[rowIndex];
    const targetProjectId = row.type === "add-schedule" ? row.projectId : row.type === "project" ? row.project.id : row.project.id;

    if (!expandedProjects.has(targetProjectId)) {
      setExpandedProjects((prev) => new Set(prev).add(targetProjectId));
    }
    setInlineCreate({
      projectId: targetProjectId,
      date: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    });
  }, [rows, expandedProjects]);

  const handleBarClick = useCallback((schedule: ProjectScheduleDTO, rect: DOMRect) => {
    setPopover({ schedule, rect });
  }, []);

  const handleDateChange = (id: string, newStartDate: string, newEndDate: string | null) => {
    updateSchedule.mutate({ id, data: { startDate: newStartDate, endDate: newEndDate } });
  };

  const handleRowChange = useCallback(
    (fromGlobalRow: number, toGlobalRow: number) => {
      // fromGlobalRow로 프로젝트와 로컬 인덱스 찾기
      for (const [projectId, range] of projectScheduleRange) {
        const fromLocal = fromGlobalRow - range.startRow;
        if (fromLocal < 0 || fromLocal >= range.count) continue;

        const toLocal = Math.max(0, Math.min(range.count - 1, toGlobalRow - range.startRow));
        if (fromLocal === toLocal) return;

        const project = projects.find((p) => p.id === projectId);
        if (!project) return;

        const reordered = [...project.schedules];
        const [moved] = reordered.splice(fromLocal, 1);
        reordered.splice(toLocal, 0, moved);

        reorderSchedules.mutate(
          reordered.map((item, i) => ({ id: item.id, sortOrder: i }))
        );
        return;
      }
    },
    [projectScheduleRange, projects, reorderSchedules]
  );

  const handleDragRow = useCallback(
    (scheduleId: string, targetGlobalRow: number) => {
      // scheduleId로 프로젝트 찾기
      const scheduleRow = rows.find(
        (r) => r.type === "schedule" && r.schedule!.id === scheduleId
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

  const startInlineCreate = (projectId: string) => {
    if (!expandedProjects.has(projectId)) {
      setExpandedProjects((prev) => new Set(prev).add(projectId));
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setInlineCreate({ projectId, date: `${yyyy}-${mm}-${dd}` });
  };

  const handleInlineSubmit = (title: string, startDate: string, category: TaskCategory) => {
    if (!inlineCreate) return;
    const project = projects.find((p) => p.id === inlineCreate.projectId);
    createSchedule.mutate({
      title,
      startDate,
      endDate: inlineCreate.endDate,
      projectId: inlineCreate.projectId,
      category,
      sortOrder: project?.schedules.length ?? 0,
    });
  };

  const handleInlineCancel = () => {
    setInlineCreate(null);
  };

  // 좌측 패널 높이 동기화
  const contentHeight = Math.max(totalRows, 1) * ROW_HEIGHT;

  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {/* 좌측 고정 패널 */}
      <div className="shrink-0 border-r border-border bg-background" style={{ width: LEFT_PANEL_WIDTH }}>
        {/* 헤더 영역 */}
        <div className="h-12 border-b border-border flex items-center px-3">
          <span className="text-xs font-medium text-muted-foreground">프로젝트</span>
        </div>

        {/* 행 목록 */}
        <div style={{ height: contentHeight }}>
          {rows.map((row) => {
            if (row.type === "project") {
              const isExpanded = expandedProjects.has(row.project.id);
              return (
                <div
                  key={`p-${row.project.id}`}
                  className="flex items-center gap-1 px-2 border-b border-border/30 group"
                  style={{ height: ROW_HEIGHT }}
                >
                  <button
                    type="button"
                    onClick={() => toggleProject(row.project.id)}
                    className="shrink-0 size-5 flex items-center justify-center rounded hover:bg-accent cursor-pointer"
                  >
                    <ChevronRightIcon
                      className={cn(
                        "size-3.5 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{row.project.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{row.project.companyName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() => startInlineCreate(row.project.id)}
                  >
                    <PlusIcon className="size-3" />
                  </Button>
                </div>
              );
            }

            if (row.type === "add-schedule") {
              const isInline = inlineCreate?.projectId === row.projectId;
              return (
                <div
                  key={`add-${row.projectId}`}
                  className="flex items-center border-b border-border/30"
                  style={{ height: ROW_HEIGHT }}
                >
                  {isInline ? (
                    <span className="pl-7 text-xs text-muted-foreground/60">새 일정...</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startInlineCreate(row.projectId)}
                      className="flex items-center gap-1 pl-7 text-xs text-muted-foreground/60 hover:text-muted-foreground cursor-pointer"
                    >
                      <PlusIcon className="size-3" />
                      새 일정
                    </button>
                  )}
                </div>
              );
            }

            // schedule row
            const config = getCategoryConfig(row.schedule!.category);
            return (
              <div
                key={`s-${row.schedule!.id}`}
                className="flex items-center gap-1.5 pl-7 pr-2 border-b border-border/30"
                style={{ height: ROW_HEIGHT }}
              >
                <span className={cn("size-2 rounded-full shrink-0", config.dot)} />
                <span className="text-xs truncate text-muted-foreground">{row.schedule!.title}</span>
              </div>
            );
          })}

        </div>
      </div>

      {/* 우측 스크롤 간트 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto hide-scrollbar"
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
            rowCount={totalRows}
            onEmptyClick={handleEmptyClick}
            onDragCreate={handleDragCreate}
          >
            {rows.map((row) => {
              if (row.type === "project") {
                const isExpanded = expandedProjects.has(row.project.id);
                if (isExpanded) {
                  // 펼침: 행만 표시 (바는 schedule 행에서)
                  return null;
                }
                // 접힘: 요약 바
                return (
                  <SummaryBar
                    key={`summary-${row.project.id}`}
                    project={row.project}
                    rowIndex={row.globalRow}
                    rangeStart={range.start}
                  />
                );
              }

              if (row.type === "add-schedule") {
                if (inlineCreate?.projectId === row.projectId) {
                  return (
                    <InlineCreateRow
                      key={`inline-${row.projectId}`}
                      dateStr={inlineCreate.date}
                      rowIndex={row.globalRow}
                      rangeStart={range.start}
                      onSubmit={handleInlineSubmit}
                      onCancel={handleInlineCancel}
                    />
                  );
                }
                return null; // 간트 영역에서는 빈 행
              }

              // schedule bar
              const schedule = row.schedule!;
              const projectRange = projectScheduleRange.get(row.project.id);
              const visualRow = getVisualRow(row.project.id, row.localIndex, row.globalRow);

              return (
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
              );
            })}

          </GanttGrid>
        </div>
      </div>

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
