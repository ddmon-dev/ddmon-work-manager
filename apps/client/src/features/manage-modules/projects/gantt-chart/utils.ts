import {
  parseISO,
  differenceInCalendarDays,
  addDays,
  subDays,
  startOfDay,
  isWeekend,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  format,
} from "date-fns";

// ── 상수 ──────────────────────────────────────────────────────

export const DAY_WIDTH = 40;
export const ROW_HEIGHT = 36;
export const HEADER_HEIGHT = 48;
export const BAR_HEIGHT = 26;
export const BAR_Y_OFFSET = (ROW_HEIGHT - BAR_HEIGHT) / 2;

// ── 타임라인 범위 계산 ───────────────────────────────────────

interface ComputeRangeParams {
  schedules: { startDate: string; endDate: string | null }[];
  contractDate?: string | null;
  deliveredDate?: string | null;
  completedDate?: string | null;
}

export function computeTimelineRange({
  schedules,
  contractDate,
  deliveredDate,
  completedDate,
}: ComputeRangeParams): { start: Date; end: Date } {
  const dates: Date[] = [];

  for (const s of schedules) {
    dates.push(parseISO(s.startDate));
    if (s.endDate) dates.push(parseISO(s.endDate));
  }

  if (contractDate) dates.push(parseISO(contractDate));
  if (deliveredDate) dates.push(parseISO(deliveredDate));
  if (completedDate) dates.push(parseISO(completedDate));

  if (dates.length === 0) {
    const today = startOfDay(new Date());
    return { start: subDays(today, 7), end: addDays(today, 21) };
  }

  const timestamps = dates.map((d) => d.getTime());
  const min = new Date(Math.min(...timestamps));
  const max = new Date(Math.max(...timestamps));

  return {
    start: subDays(startOfDay(min), 7),
    end: addDays(startOfDay(max), 14),
  };
}

// ── 좌표 변환 ─────────────────────────────────────────────────

export function dateToX(date: Date, rangeStart: Date): number {
  return differenceInCalendarDays(date, rangeStart) * DAY_WIDTH;
}

export function xToDate(x: number, rangeStart: Date): Date {
  const days = Math.round(x / DAY_WIDTH);
  return addDays(rangeStart, days);
}

// ── 날짜 유틸 ─────────────────────────────────────────────────

export function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const totalDays = differenceInCalendarDays(end, start) + 1;
  for (let i = 0; i < totalDays; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

export function getMonthsInRange(start: Date, end: Date) {
  const months = eachMonthOfInterval({ start, end });
  return months.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);
    const visibleStart = monthStart < start ? start : monthStart;
    const visibleEnd = monthEnd > end ? end : monthEnd;
    const startX = dateToX(visibleStart, start);
    const width = (differenceInCalendarDays(visibleEnd, visibleStart) + 1) * DAY_WIDTH;

    return {
      date: monthStart,
      label: format(monthStart, "M월"),
      x: startX,
      width,
    };
  });
}

export function getTotalWidth(start: Date, end: Date): number {
  return (differenceInCalendarDays(end, start) + 1) * DAY_WIDTH;
}

export { isWeekend, isSameDay, startOfDay, format, addDays, differenceInCalendarDays, parseISO };
