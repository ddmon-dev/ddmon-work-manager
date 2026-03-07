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
}

export function TimelineHeader({ rangeStart, rangeEnd, totalWidth }: TimelineHeaderProps) {
  const today = startOfDay(new Date());
  const months = getMonthsInRange(rangeStart, rangeEnd);
  const days = getDaysInRange(rangeStart, rangeEnd);

  return (
    <div
      className="sticky top-0 z-10 border-b border-border bg-background"
      style={{ width: totalWidth, height: HEADER_HEIGHT }}
    >
      {/* 월 레이블 */}
      <div className="flex h-6 border-b border-border">
        {months.map((month, i) => (
          <div
            key={month.label}
            className={cn("shrink-0", i < months.length - 1 && "border-r border-border")}
            style={{ width: month.width }}
          >
            <div className="sticky left-0 w-fit text-xs font-medium text-muted-foreground flex items-center h-full px-2">
              {month.label}
            </div>
          </div>
        ))}
      </div>

      {/* 일 숫자 */}
      <div className="flex h-[22px]">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const weekend = isWeekend(day);
          const isLastOfMonth =
            i < days.length - 1 && days[i + 1].getDate() === 1;

          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center text-[10px] tabular-nums shrink-0",
                weekend && "text-destructive",
                isToday && "text-primary font-bold",
                isLastOfMonth && "border-r border-border"
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
