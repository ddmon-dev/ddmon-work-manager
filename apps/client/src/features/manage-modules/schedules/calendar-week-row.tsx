import { format, isToday, isSameMonth } from "date-fns";
import { cn } from "@/shared/utils/classnames";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { useManageSheet } from "../_base/ui";
import { getColorConfig } from "./constants";
import { computeWeekLayout, type EventPlacement } from "./calendar-layout";
import type { CalendarSchedule } from "./types";

const MAX_SLOTS = 3;

interface CalendarWeekRowProps {
  weekDates: Date[];
  currentDate: Date;
  schedules: CalendarSchedule[];
  hoveredScheduleId: string | null;
  onScheduleHover: (id: string | null) => void;
}

export function CalendarWeekRow({
  weekDates,
  currentDate,
  schedules,
  hoveredScheduleId,
  onScheduleHover,
}: CalendarWeekRowProps) {
  const sheet = useManageSheet();

  const placements = computeWeekLayout(weekDates, schedules);

  // 슬롯 제한: MAX_SLOTS 이내만 표시
  const visiblePlacements = placements.filter((p) => p.slot < MAX_SLOTS);

  // 각 날짜별 초과 건수 계산
  const overflowCounts = new Array(7).fill(0);
  for (const p of placements) {
    if (p.slot >= MAX_SLOTS) {
      for (let c = p.colStart - 1; c < p.colStart - 1 + p.colSpan; c++) {
        overflowCounts[c]++;
      }
    }
  }

  function handleCellClick(date: Date) {
    sheet.open({
      mode: "create",
      meta: { createDate: format(date, "yyyy-MM-dd") },
    });
  }

  function handleScheduleClick(
    e: React.MouseEvent,
    schedule: CalendarSchedule
  ) {
    e.stopPropagation();
    const scheduleId = schedule.sourceId ?? schedule.id;
    const mode = e.metaKey ? "duplicate" : "view";
    sheet.open({ mode, id: scheduleId });
  }

  // 가장 높은 표시 슬롯 수
  const maxVisibleSlot =
    visiblePlacements.length > 0
      ? Math.min(
          Math.max(...visiblePlacements.map((p) => p.slot)) + 1,
          MAX_SLOTS
        )
      : 0;
  const hasOverflow = overflowCounts.some((c) => c > 0);

  return (
    <div className="relative flex flex-col border-b overflow-hidden">
      {/* 그리드 라인 + 셀 클릭 오버레이 */}
      <div className="absolute inset-0 grid grid-cols-7">
        {weekDates.map((date, i) => (
          <div
            key={`grid-${i}`}
            className={cn(
              "border-r last:border-r-0 cursor-pointer transition-colors hover:bg-muted/50",
              !isSameMonth(date, currentDate) && "bg-muted/20"
            )}
            onClick={() => handleCellClick(date)}
          />
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="relative pointer-events-none">
        {/* 날짜 행 */}
        <div className="grid grid-cols-7">
          {weekDates.map((date, i) => (
            <div key={i} className="px-1 pt-1">
              <div
                className={cn(
                  "text-xs font-medium size-6 flex items-center justify-center rounded-full",
                  isToday(date) && "bg-primary text-primary-foreground",
                  !isSameMonth(date, currentDate) && "text-muted-foreground"
                )}
              >
                {format(date, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* 이벤트 영역 */}
        <div className="flex-1 min-h-0 overflow-hidden space-y-0.5 pb-0.5">
          {Array.from({ length: maxVisibleSlot }, (_, slotIdx) => (
            <div key={`slot-${slotIdx}`} className="grid grid-cols-7">
              {renderSlot(
                visiblePlacements,
                slotIdx,
                weekDates,
                handleScheduleClick,
                hoveredScheduleId,
                onScheduleHover
              )}
            </div>
          ))}
        </div>

        {/* +N건 오버플로 행 */}
        {hasOverflow && (
          <div className="grid grid-cols-7">
            {weekDates.map((date, i) => (
              <div key={`overflow-${i}`} className="px-1 pb-0.5">
                {overflowCounts[i] > 0 && (
                  <Popover modal>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-[11px] text-muted-foreground hover:text-foreground px-0.5 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        +{overflowCounts[i]}건
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-56 p-2 space-y-1"
                      align="start"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">
                        {format(date, "M월 d일")}
                      </div>
                      {getDaySchedules(date, schedules).map((schedule) => {
                        const color = getColorConfig(schedule.color);
                        return (
                          <PopoverClose key={schedule.id} asChild>
                            <button
                              type="button"
                              className={cn(
                                "w-full text-left text-[11px] leading-tight px-2 py-1 rounded truncate transition-colors",
                                color.bg,
                                "hover:brightness-90"
                              )}
                              onClick={(e) => {
                                const scheduleId =
                                  schedule.sourceId ?? schedule.id;
                                const mode = e.metaKey ? "duplicate" : "view";
                                sheet.open({ mode, id: scheduleId });
                              }}
                            >
                              {formatEventLabel(schedule)}
                            </button>
                          </PopoverClose>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderSlot(
  placements: EventPlacement[],
  slotIdx: number,
  weekDates: Date[],
  onScheduleClick: (e: React.MouseEvent, schedule: CalendarSchedule) => void,
  hoveredScheduleId: string | null,
  onScheduleHover: (id: string | null) => void
) {
  const slotPlacements = placements.filter((p) => p.slot === slotIdx);

  const cells: React.ReactNode[] = [];
  let col = 0;

  while (col < 7) {
    const placement = slotPlacements.find((p) => p.colStart - 1 === col);

    if (placement) {
      const color = getColorConfig(placement.schedule.color);
      const { isStart, isEnd } = placement;
      const isHovered = hoveredScheduleId === placement.schedule.id;

      cells.push(
        <div
          key={`${slotIdx}-${col}`}
          className={cn("min-h-[22px]", isStart && "pl-1", isEnd && "pr-1")}
          style={{
            gridColumn: `${placement.colStart} / span ${placement.colSpan}`,
          }}
        >
          <button
            type="button"
            className={cn(
              "w-full text-left text-[11px] leading-tight h-full px-1.5 py-0.5 truncate pointer-events-auto transition-colors",
              isHovered ? color.bgActive : color.bg,
              isStart && isEnd && "rounded",
              isStart && !isEnd && "rounded-l",
              !isStart && isEnd && "rounded-r",
              !isStart && !isEnd && "rounded-none"
            )}
            onMouseEnter={() => onScheduleHover(placement.schedule.id)}
            onMouseLeave={() => onScheduleHover(null)}
            onClick={(e) => onScheduleClick(e, placement.schedule)}
          >
            {isStart && (
              <span className="block truncate">
                {formatEventLabel(placement.schedule)}
              </span>
            )}
          </button>
        </div>
      );

      col += placement.colSpan;
    } else {
      const isCovered = slotPlacements.some(
        (p) => col >= p.colStart - 1 && col < p.colStart - 1 + p.colSpan
      );

      if (!isCovered) {
        cells.push(
          <div
            key={`${slotIdx}-${col}`}
            className="min-h-[22px]"
            style={{ gridColumn: `${col + 1} / span 1` }}
          />
        );
      }
      col++;
    }
  }

  return cells;
}

const CLIENT_NAME_MAX = 6;

function formatEventLabel(schedule: CalendarSchedule) {
  if (!schedule.clientName) return schedule.title;
  const name =
    schedule.clientName.length > CLIENT_NAME_MAX
      ? schedule.clientName.slice(0, CLIENT_NAME_MAX) + ".."
      : schedule.clientName;
  return `${name} | ${schedule.title}`;
}

function getDaySchedules(date: Date, schedules: CalendarSchedule[]) {
  const dateStr = format(date, "yyyy-MM-dd");
  return schedules.filter((s) => {
    const end = s.endDate ?? s.startDate;
    return s.startDate <= dateStr && end >= dateStr;
  });
}
