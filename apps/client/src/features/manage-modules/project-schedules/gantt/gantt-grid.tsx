import { useState } from "react";
import { cn } from "@/shared/utils/classnames";
import {
  DAY_WIDTH,
  ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
  getDaysInRange,
  dateToX,
  xToDate,
  isWeekend,
  startOfDay,
} from "./utils";

interface GanttGridProps {
  rangeStart: Date;
  rangeEnd: Date;
  totalWidth: number;
  rowCount: number;
  onEmptyClick: (date: Date, rowIndex: number) => void;
  onDragCreate?: (startDate: Date, endDate: Date, rowIndex: number) => void;
  children: React.ReactNode;
}

const CLICK_THRESHOLD = 4;

export function GanttGrid({
  rangeStart,
  rangeEnd,
  totalWidth,
  rowCount,
  onEmptyClick,
  onDragCreate,
  children,
}: GanttGridProps) {
  const today = startOfDay(new Date());
  const days = getDaysInRange(rangeStart, rangeEnd);
  const todayX = dateToX(today, rangeStart);
  const showTodayLine = todayX >= 0 && todayX <= totalWidth;
  const contentHeight = Math.max(rowCount, 1) * ROW_HEIGHT;

  const [dragState, setDragState] = useState<{
    startX: number;
    currentX: number;
    rowIndex: number;
    active: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-gantt-bar]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const y = e.clientY - rect.top;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({ startX: x, currentX: x, rowIndex: Math.floor(y / ROW_HEIGHT), active: false });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const moved = Math.abs(x - dragState.startX) > CLICK_THRESHOLD;
    setDragState((prev) => (prev ? { ...prev, currentX: x, active: moved || prev.active } : null));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    if (dragState.active && onDragCreate) {
      const x1 = Math.min(dragState.startX, dragState.currentX);
      const x2 = Math.max(dragState.startX, dragState.currentX);
      onDragCreate(xToDate(x1, rangeStart), xToDate(x2, rangeStart), dragState.rowIndex);
    } else if (!dragState.active) {
      onEmptyClick(xToDate(dragState.startX, rangeStart), dragState.rowIndex);
    }

    setDragState(null);
  };

  return (
    <div
      className="relative cursor-crosshair"
      style={{ width: totalWidth, minHeight: contentHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 세로 그리드 줄 + 주말 배경 */}
      {days.map((day, i) => {
        const weekend = isWeekend(day);
        const isLastOfMonth =
          i < days.length - 1 && days[i + 1].getDate() === 1;
        return (
          <div
            key={i}
            className={cn(
              "absolute top-0 bottom-0 border-r border-border/50",
              weekend && "bg-muted/50",
              isLastOfMonth && "border-r-border"
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

      {/* 드래그 프리뷰 바 */}
      {dragState?.active && (() => {
        const left = Math.min(dragState.startX, dragState.currentX);
        const width = Math.abs(dragState.currentX - dragState.startX);
        const top = dragState.rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;
        return (
          <div
            className="absolute rounded-md bg-primary/15 border border-primary/30 pointer-events-none z-10"
            style={{ left, width: Math.max(width, DAY_WIDTH), top, height: BAR_HEIGHT }}
          />
        );
      })()}

      {/* 일정 바들 */}
      {children}
    </div>
  );
}
