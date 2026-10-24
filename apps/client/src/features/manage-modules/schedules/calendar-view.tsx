import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { CalendarWeekRow } from "./calendar-week-row";
import type { CalendarSchedule } from "./types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarViewProps {
  year: number;
  month: number;
  schedules: CalendarSchedule[];
  isLoading?: boolean;
}

function getCalendarWeeks(year: number, month: number): Date[][] {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  return weeks;
}

export function CalendarView({ year, month, schedules, isLoading = false }: CalendarViewProps) {
  const currentDate = new Date(year, month - 1);
  const weeks = getCalendarWeeks(year, month);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div role={isLoading ? "status" : undefined} aria-label={isLoading ? "캘린더 일정을 불러오고 있습니다" : undefined} aria-busy={isLoading} className="border rounded-lg overflow-hidden flex flex-col flex-1">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${
              i === 0
                ? "text-red-500"
                : i === 6
                  ? "text-blue-500"
                  : "text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 캘린더 주 행 */}
      <div
        className="grid flex-1"
        style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}
      >
        {weeks.map((weekDates, i) => (
          <CalendarWeekRow
            key={i}
            isLoading={isLoading}
            weekDates={weekDates}
            currentDate={currentDate}
            schedules={schedules}
            hoveredScheduleId={hoveredId}
            onScheduleHover={setHoveredId}
          />
        ))}
      </div>
    </div>
  );
}
