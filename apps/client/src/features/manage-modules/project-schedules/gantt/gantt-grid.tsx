import { useState, useRef, useMemo, memo } from "react";
import { cn } from "@/shared/utils/classnames";
import {
  DAY_WIDTH,
  ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
  CLICK_THRESHOLD,
  TODAY,
  getDaysInRange,
  dateToX,
  xToDate,
  differenceInCalendarDays,
  isWeekend,
} from "./utils";

interface GanttGridProps {
  rangeStart: Date;
  rangeEnd: Date;
  totalWidth: number;
  rowCount: number;
  hoverCell: { col: number; row: number } | null;
  onEmptyClick: (date: Date, rowIndex: number, anchorRect: DOMRect) => void;
  onDragCreate?: (startDate: Date, endDate: Date, rowIndex: number, anchorRect: DOMRect) => void;
  canDragRow?: (rowIndex: number) => boolean;
  onHoverCell?: (cell: { col: number; row: number } | null) => void;
  children: React.ReactNode;
}

export function GanttGrid({
  rangeStart,
  rangeEnd,
  totalWidth,
  rowCount,
  hoverCell,
  onEmptyClick,
  onDragCreate,
  canDragRow,
  onHoverCell,
  children,
}: GanttGridProps) {
  const days = useMemo(() => getDaysInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
  const todayX = dateToX(TODAY, rangeStart);
  const showTodayLine = todayX >= 0 && todayX <= totalWidth;
  const contentHeight = Math.max(rowCount, 1) * ROW_HEIGHT;

  const [dragState, setDragState] = useState<{
    startX: number;
    currentX: number;
    rowIndex: number;
    active: boolean;
  } | null>(null);

  // 마우스 이동 시 중복 호출 방지용 ref (setState 없이 dedup)
  const lastHoverRef = useRef<{ col: number; row: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / DAY_WIDTH);
    const row = Math.floor(y / ROW_HEIGHT);
    const prev = lastHoverRef.current;
    if (prev?.col === col && prev?.row === row) return;
    lastHoverRef.current = { col, row };
    onHoverCell?.({ col, row });
  };

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
    const canDrag = !canDragRow || canDragRow(dragState.rowIndex);
    setDragState((prev) => (prev ? { ...prev, currentX: x, active: (moved || prev.active) && canDrag } : null));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    const gridRect = e.currentTarget.getBoundingClientRect();

    if (dragState.active && onDragCreate) {
      const x1 = Math.min(dragState.startX, dragState.currentX);
      const x2 = Math.max(dragState.startX, dragState.currentX);
      const start = xToDate(x1, rangeStart);
      const end = xToDate(x2, rangeStart);

      const barLeft = dateToX(start, rangeStart);
      const days = differenceInCalendarDays(end, start) + 1;
      const barWidth = Math.max(days * DAY_WIDTH, DAY_WIDTH);
      const barTop = dragState.rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;

      const anchorRect = new DOMRect(
        gridRect.left + barLeft, gridRect.top + barTop, barWidth, BAR_HEIGHT,
      );
      onDragCreate(start, end, dragState.rowIndex, anchorRect);
    } else if (!dragState.active) {
      const date = xToDate(dragState.startX, rangeStart);
      const barLeft = dateToX(date, rangeStart);
      const barTop = dragState.rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;

      const anchorRect = new DOMRect(
        gridRect.left + barLeft, gridRect.top + barTop, DAY_WIDTH, BAR_HEIGHT,
      );
      onEmptyClick(date, dragState.rowIndex, anchorRect);
    }

    setDragState(null);
  };

  return (
    <div
      className="relative"
      style={{
        width: totalWidth,
        minHeight: contentHeight,
        cursor: hoverCell && canDragRow && !canDragRow(hoverCell.row) ? "pointer" : "crosshair",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { lastHoverRef.current = null; onHoverCell?.(null); }}
    >
      <GridLines days={days} rowCount={rowCount} />

      {/* 호버 크로스헤어 */}
      {hoverCell && !dragState?.active && (
        <>
          <div
            className="absolute top-0 bottom-0 bg-foreground/[0.02] pointer-events-none z-[2]"
            style={{ left: hoverCell.col * DAY_WIDTH, width: DAY_WIDTH }}
          />
          <div
            className="absolute left-0 right-0 bg-foreground/[0.02] pointer-events-none z-[2]"
            style={{ top: hoverCell.row * ROW_HEIGHT, height: ROW_HEIGHT }}
          />
        </>
      )}

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

// 세로/가로 그리드 줄 — days와 rowCount에만 의존
const GridLines = memo(function GridLines({ days, rowCount }: { days: Date[]; rowCount: number }) {
  return (
    <>
      {days.map((day, i) => {
        const weekend = isWeekend(day);
        const isLastOfMonth = i < days.length - 1 && days[i + 1].getDate() === 1;
        return (
          <div
            key={i}
            className={cn(
              "absolute top-0 bottom-0 border-r border-border/50",
              weekend && "bg-destructive/4",
              isLastOfMonth && "border-r-border"
            )}
            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
          />
        );
      })}
      {Array.from({ length: rowCount - 1 }, (_, i) => (
        <div
          key={`row-${i}`}
          className="absolute left-0 right-0 border-b border-border/30"
          style={{ top: (i + 1) * ROW_HEIGHT - 1 }}
        />
      ))}
    </>
  );
});
