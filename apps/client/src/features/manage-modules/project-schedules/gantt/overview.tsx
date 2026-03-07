import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type { TaskCategory } from "@packages/schemas";
import {
  useProjectScheduleOverview,
  useCreateProjectSchedule,
  useUpdateProjectSchedule,
  useReorderProjectSchedules,
} from "../api";
import { getCategoryConfig } from "../constants";
import type { ProjectScheduleDTO, OverviewProject } from "../types";
import {
  computeOverviewRange,
  getTotalWidth,
  dateToX,
  startOfDay,
  parseISO,
  differenceInCalendarDays,
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
        <h1 className="text-xl font-semibold tracking-tight">프로젝트 일정</h1>
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="active">진행중</TabsTrigger>
            <TabsTrigger value="completed">완료</TabsTrigger>
          </TabsList>
        </Tabs>
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

function OverviewGantt({ projects }: { projects: OverviewProject[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const createSchedule = useCreateProjectSchedule();
  const updateSchedule = useUpdateProjectSchedule();
  const reorderSchedules = useReorderProjectSchedules();

  const [popover, setPopover] = useState<{ schedule: ProjectScheduleDTO; rect: DOMRect } | null>(null);
  const [inlineCreate, setInlineCreate] = useState<{ projectId: string; date: string } | null>(null);

  const range = useMemo(() => computeOverviewRange(projects), [projects]);
  const totalWidth = useMemo(() => getTotalWidth(range.start, range.end), [range]);

  // 행 구조 계산
  const rows = useMemo(() => {
    const result: { type: "project" | "schedule"; project: OverviewProject; schedule?: ProjectScheduleDTO; globalRow: number }[] = [];
    let row = 0;
    for (const p of projects) {
      result.push({ type: "project", project: p, globalRow: row });
      row++;
      if (expandedProjects.has(p.id)) {
        for (const s of p.schedules) {
          result.push({ type: "schedule", project: p, schedule: s, globalRow: row });
          row++;
        }
        // 인라인 생성 행
        if (inlineCreate?.projectId === p.id) {
          row++;
        }
      }
    }
    return result;
  }, [projects, expandedProjects, inlineCreate]);

  const totalRows = rows.length + (inlineCreate ? 1 : 0);

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

  const handleEmptyClick = useCallback((_date: Date) => {
    // 오버뷰에서 빈 영역 클릭은 무시
  }, []);

  const handleBarClick = useCallback((schedule: ProjectScheduleDTO, rect: DOMRect) => {
    setPopover({ schedule, rect });
  }, []);

  const handleDateChange = (id: string, newStartDate: string, newEndDate: string | null) => {
    updateSchedule.mutate({ id, data: { startDate: newStartDate, endDate: newEndDate } });
  };

  const handleRowChange = useCallback(
    (fromIndex: number, toIndex: number) => {
      // 오버뷰에서는 행 순서 변경 비활성화
    },
    []
  );

  const handleAddClick = (projectId: string) => {
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
          {rows.map((row, i) => {
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
                    onClick={() => handleAddClick(row.project.id)}
                  >
                    <PlusIcon className="size-3" />
                  </Button>
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

          {/* 인라인 생성 행 - 좌측 패널 부분 */}
          {inlineCreate && expandedProjects.has(inlineCreate.projectId) && (
            <div
              className="flex items-center pl-7 pr-2 border-b border-border/30"
              style={{ height: ROW_HEIGHT }}
            >
              <span className="text-xs text-muted-foreground/60">새 일정...</span>
            </div>
          )}
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

              // schedule bar
              const schedule = row.schedule!;
              return (
                <GanttBar
                  key={schedule.id}
                  schedule={schedule}
                  rowIndex={row.globalRow}
                  rangeStart={range.start}
                  totalRows={totalRows}
                  onDateChange={handleDateChange}
                  onRowChange={handleRowChange}
                  onBarClick={handleBarClick}
                  disableReorder
                />
              );
            })}

            {/* 인라인 생성 */}
            {inlineCreate && expandedProjects.has(inlineCreate.projectId) && (() => {
              const project = projects.find((p) => p.id === inlineCreate.projectId);
              if (!project) return null;
              // 인라인 행은 해당 프로젝트의 마지막 schedule 행 다음
              const projectRow = rows.find((r) => r.type === "project" && r.project.id === inlineCreate.projectId);
              if (!projectRow) return null;
              const scheduleCount = project.schedules.length;
              const inlineRowIndex = projectRow.globalRow + 1 + scheduleCount;

              return (
                <InlineCreateRow
                  dateStr={inlineCreate.date}
                  rowIndex={inlineRowIndex}
                  rangeStart={range.start}
                  onSubmit={handleInlineSubmit}
                  onCancel={handleInlineCancel}
                />
              );
            })()}
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
