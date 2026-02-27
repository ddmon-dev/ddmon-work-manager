import { format } from "date-fns";
import type { CalendarSchedule } from "./types";

export interface EventPlacement {
  schedule: CalendarSchedule;
  colStart: number; // 1-based (CSS grid-column)
  colSpan: number;
  slot: number; // 세로 슬롯 인덱스
  isStart: boolean; // 이 주에서 이벤트가 시작하는지
  isEnd: boolean; // 이 주에서 이벤트가 끝나는지
}

/**
 * 주(week) 단위 이벤트 레이아웃을 계산한다.
 * 멀티데이 이벤트는 긴 순서대로 낮은 슬롯에 우선 배치하고,
 * 단일 이벤트는 멀티데이 슬롯 아래에 배치한다.
 */
export function computeWeekLayout(
  weekDates: Date[],
  schedules: CalendarSchedule[]
): EventPlacement[] {
  const weekStart = format(weekDates[0], "yyyy-MM-dd");
  const weekEnd = format(weekDates[6], "yyyy-MM-dd");

  // 이 주에 걸치는 일정 필터
  const relevant = schedules.filter((s) => {
    const end = s.endDate ?? s.startDate;
    return s.startDate <= weekEnd && end >= weekStart;
  });

  // 멀티데이와 단일 분리
  const multiDay: CalendarSchedule[] = [];
  const singleDay: CalendarSchedule[] = [];

  for (const s of relevant) {
    if (s.endDate && s.endDate !== s.startDate) {
      multiDay.push(s);
    } else {
      singleDay.push(s);
    }
  }

  // 멀티데이: 기간이 긴 순서, 같으면 시작일 빠른 순
  multiDay.sort((a, b) => {
    const spanA = daySpan(a, weekStart, weekEnd);
    const spanB = daySpan(b, weekStart, weekEnd);
    if (spanB !== spanA) return spanB - spanA;
    return a.startDate.localeCompare(b.startDate);
  });

  const placements: EventPlacement[] = [];
  // 슬롯 점유 맵: slot -> Set<colIndex(0-based)>
  const occupied = new Map<number, Set<number>>();

  // 멀티데이 배치
  for (const schedule of multiDay) {
    const { colStart, colSpan, isStart, isEnd } = getColumnRange(
      schedule,
      weekDates
    );
    const slot = findAvailableSlot(occupied, colStart - 1, colSpan);
    markOccupied(occupied, slot, colStart - 1, colSpan);
    placements.push({ schedule, colStart, colSpan, slot, isStart, isEnd });
  }

  // 단일 이벤트 배치
  for (const schedule of singleDay) {
    const { colStart, colSpan, isStart, isEnd } = getColumnRange(
      schedule,
      weekDates
    );
    const slot = findAvailableSlot(occupied, colStart - 1, colSpan);
    markOccupied(occupied, slot, colStart - 1, colSpan);
    placements.push({ schedule, colStart, colSpan, slot, isStart, isEnd });
  }

  return placements;
}

function daySpan(
  schedule: CalendarSchedule,
  weekStart: string,
  weekEnd: string
): number {
  const clampedStart =
    schedule.startDate < weekStart ? weekStart : schedule.startDate;
  const end = schedule.endDate ?? schedule.startDate;
  const clampedEnd = end > weekEnd ? weekEnd : end;

  const start = new Date(clampedStart);
  const endDate = new Date(clampedEnd);
  return Math.round((endDate.getTime() - start.getTime()) / 86400000) + 1;
}

function getColumnRange(
  schedule: CalendarSchedule,
  weekDates: Date[]
): { colStart: number; colSpan: number; isStart: boolean; isEnd: boolean } {
  const weekStart = format(weekDates[0], "yyyy-MM-dd");
  const weekEnd = format(weekDates[6], "yyyy-MM-dd");

  const eventStart = schedule.startDate;
  const eventEnd = schedule.endDate ?? schedule.startDate;

  const clampedStart = eventStart < weekStart ? weekStart : eventStart;
  const clampedEnd = eventEnd > weekEnd ? weekEnd : eventEnd;

  const startIdx = weekDates.findIndex(
    (d) => format(d, "yyyy-MM-dd") === clampedStart
  );
  const endIdx = weekDates.findIndex(
    (d) => format(d, "yyyy-MM-dd") === clampedEnd
  );

  return {
    colStart: startIdx + 1, // CSS grid-column은 1-based
    colSpan: endIdx - startIdx + 1,
    isStart: eventStart >= weekStart,
    isEnd: eventEnd <= weekEnd,
  };
}

function findAvailableSlot(
  occupied: Map<number, Set<number>>,
  colIndex: number,
  colSpan: number
): number {
  for (let slot = 0; ; slot++) {
    const used = occupied.get(slot);
    if (!used) return slot;

    let available = true;
    for (let c = colIndex; c < colIndex + colSpan; c++) {
      if (used.has(c)) {
        available = false;
        break;
      }
    }
    if (available) return slot;
  }
}

function markOccupied(
  occupied: Map<number, Set<number>>,
  slot: number,
  colIndex: number,
  colSpan: number
) {
  if (!occupied.has(slot)) {
    occupied.set(slot, new Set());
  }
  const used = occupied.get(slot)!;
  for (let c = colIndex; c < colIndex + colSpan; c++) {
    used.add(c);
  }
}
