import { cn } from "@/shared/utils/classnames";
import {
  DAY_WIDTH,
  ROW_HEIGHT,
  getDaysInRange,
  dateToX,
  xToDate,
  isWeekend,
  isSameDay,
  startOfDay,
} from "./utils";

interface GanttGridProps {
  rangeStart: Date;
  rangeEnd: Date;
  totalWidth: number;
  rowCount: number;
  onEmptyClick: (date: Date) => void;
  children: React.ReactNode;
}

export function GanttGrid({
  rangeStart,
  rangeEnd,
  totalWidth,
  rowCount,
  onEmptyClick,
  children,
}: GanttGridProps) {
  const today = startOfDay(new Date());
  const days = getDaysInRange(rangeStart, rangeEnd);
  const todayX = dateToX(today, rangeStart);
  const showTodayLine = todayX >= 0 && todayX <= totalWidth;
  const contentHeight = Math.max(rowCount, 1) * ROW_HEIGHT;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 바 클릭이면 무시
    if ((e.target as HTMLElement).closest("[data-gantt-bar]")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const date = xToDate(x, rangeStart);
    onEmptyClick(date);
  };

  return (
    <div
      className="relative cursor-crosshair"
      style={{ width: totalWidth, minHeight: contentHeight }}
      onClick={handleClick}
    >
      {/* 세로 그리드 줄 + 주말 배경 */}
      {days.map((day, i) => {
        const weekend = isWeekend(day);
        const isFirstOfMonth = day.getDate() === 1 && i > 0;
        return (
          <div
            key={i}
            className={cn(
              "absolute top-0 bottom-0 border-r border-border/50",
              weekend && "bg-muted/30",
              isFirstOfMonth && "border-l border-l-border"
            )}
            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
          />
        );
      })}

      {/* 오늘 표시선 */}
      {showTodayLine && (
        <div
          className="absolute top-0 bottom-0 w-px bg-destructive/60 z-[5]"
          style={{ left: todayX + DAY_WIDTH / 2 }}
        />
      )}

      {/* 일정 바들 */}
      {children}
    </div>
  );
}
