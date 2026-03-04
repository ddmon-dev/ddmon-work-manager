import { cn } from "@/shared/utils/classnames";
import {
  DAY_WIDTH,
  HEADER_HEIGHT,
  getDaysInRange,
  getMonthsInRange,
  isWeekend,
  isSameDay,
  startOfDay,
} from "./utils";

interface TimelineHeaderProps {
  rangeStart: Date;
  rangeEnd: Date;
  totalWidth: number;
  scrollLeft: number;
}

export function TimelineHeader({ rangeStart, rangeEnd, totalWidth, scrollLeft }: TimelineHeaderProps) {
  const today = startOfDay(new Date());
  const months = getMonthsInRange(rangeStart, rangeEnd);
  const days = getDaysInRange(rangeStart, rangeEnd);

  return (
    <div
      className="sticky top-0 z-10 border-b border-border bg-background"
      style={{ width: totalWidth, height: HEADER_HEIGHT }}
    >
      {/* 월 레이블 */}
      <div className="relative h-6 border-b border-border">
        {months.map((month, i) => {
          // 월 블록 내에서 레이블을 스크롤 위치에 고정
          const labelOffset = Math.max(0, Math.min(scrollLeft - month.x, month.width - 40));

          return (
            <div
              key={month.label}
              className={cn(
                "absolute top-0 bottom-0",
                i > 0 && "border-l border-border"
              )}
              style={{ left: month.x, width: month.width }}
            >
              <div
                className="text-xs font-medium text-muted-foreground flex items-center h-full px-2"
                style={{ transform: `translateX(${labelOffset}px)` }}
              >
                {month.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* 일 숫자 */}
      <div className="flex h-[22px]">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const weekend = isWeekend(day);
          const isFirstOfMonth = day.getDate() === 1 && i > 0;

          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center text-[10px] tabular-nums shrink-0",
                weekend && "text-muted-foreground/50",
                isToday && "text-primary font-bold",
                isFirstOfMonth && "border-l border-border"
              )}
              style={{ width: DAY_WIDTH }}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
