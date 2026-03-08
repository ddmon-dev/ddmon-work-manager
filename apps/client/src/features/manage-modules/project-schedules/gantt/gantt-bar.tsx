import { useRef, useState, useCallback } from "react";
import { cn } from "@/shared/utils/classnames";
import {
  DAY_WIDTH,
  ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_Y_OFFSET,
  dateToX,
  xToDate,
  parseISO,
  format,
  addDays,
  differenceInCalendarDays,
} from "./utils";
import { getCategoryConfig } from "../constants";
import type { ProjectScheduleDTO } from "../types";

interface GanttBarProps {
  schedule: ProjectScheduleDTO;
  rowIndex: number;
  rangeStart: Date;
  totalRows: number;
  onDateChange: (id: string, newStartDate: string, newEndDate: string | null) => void;
  onRowChange: (fromIndex: number, toIndex: number) => void;
  onBarClick: (schedule: ProjectScheduleDTO, rect: DOMRect) => void;
  onSplit?: (id: string, splitDate: string) => void;
  onDragRow?: (targetRow: number) => void;
  onDragEnd?: () => void;
  disableReorder?: boolean;
  minRow?: number;
  maxRow?: number;
}

type DragMode = "move" | "resize-left" | "resize-right" | null;

const CLICK_THRESHOLD = 4;

export function GanttBar({
  schedule,
  rowIndex,
  rangeStart,
  totalRows,
  onDateChange,
  onRowChange,
  onBarClick,
  onSplit,
  onDragRow,
  onDragEnd,
  disableReorder,
  minRow,
  maxRow,
}: GanttBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [preview, setPreview] = useState({ left: 0, width: 0, top: 0 });
  const [splitPreview, setSplitPreview] = useState<number | null>(null);
  const dragStart = useRef({ x: 0, y: 0, originalLeft: 0, originalWidth: 0, moved: false });

  const startDate = parseISO(schedule.startDate);
  const endDate = schedule.endDate ? parseISO(schedule.endDate) : null;
  const span = endDate ? differenceInCalendarDays(endDate, startDate) + 1 : 1;

  const left = dateToX(startDate, rangeStart);
  const width = span * DAY_WIDTH;
  const top = rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;
  const color = getCategoryConfig(schedule.category);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mode: DragMode) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragMode(mode);
      dragStart.current = { x: e.clientX, y: e.clientY, originalLeft: left, originalWidth: width, moved: false };
      setPreview({ left: 0, width: 0, top: 0 });
    },
    [left, width]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragMode) return;
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;

      if (Math.abs(deltaX) > CLICK_THRESHOLD || Math.abs(deltaY) > CLICK_THRESHOLD) {
        dragStart.current.moved = true;
      }

      if (dragMode === "move") {
        if (disableReorder) {
          setPreview({ left: deltaX, width: 0, top: 0 });
        } else {
          const lo = minRow ?? 0;
          const hi = maxRow ?? (totalRows - 1);
          const targetRow = Math.max(lo, Math.min(hi, rowIndex + Math.round(deltaY / ROW_HEIGHT)));
          const clampedRowDelta = (targetRow - rowIndex) * ROW_HEIGHT;
          setPreview({ left: deltaX, width: 0, top: clampedRowDelta });
          onDragRow?.(targetRow);
        }
      } else if (dragMode === "resize-left") {
        const maxShrink = dragStart.current.originalWidth - DAY_WIDTH;
        const clamped = Math.min(deltaX, maxShrink);
        setPreview({ left: clamped, width: -clamped, top: 0 });
      } else if (dragMode === "resize-right") {
        const newWidth = dragStart.current.originalWidth + deltaX;
        if (newWidth >= DAY_WIDTH) {
          setPreview({ left: 0, width: deltaX, top: 0 });
        }
      }
    },
    [dragMode, rowIndex, totalRows, onDragRow, disableReorder, minRow, maxRow]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragMode) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      const wasDragged = dragStart.current.moved;

      if (!wasDragged) {
        setDragMode(null);
        setPreview({ left: 0, width: 0, top: 0 });
        onDragEnd?.();
        if (dragMode === "move" && barRef.current) {
          if ((e.metaKey || e.ctrlKey) && onSplit && endDate && span >= 2) {
            const rect = barRef.current.getBoundingClientRect();
            const boundary = Math.round((e.clientX - rect.left) / DAY_WIDTH);
            if (boundary >= 1 && boundary <= span - 1) {
              const splitDate = format(addDays(startDate, boundary), "yyyy-MM-dd");
              onSplit(schedule.id, splitDate);
              return;
            }
          }
          onBarClick(schedule, barRef.current.getBoundingClientRect());
        }
        return;
      }

      const snappedLeft = Math.round(preview.left / DAY_WIDTH) * DAY_WIDTH;
      const snappedWidth = Math.round(preview.width / DAY_WIDTH) * DAY_WIDTH;
      const snappedTop = Math.round(preview.top / ROW_HEIGHT) * ROW_HEIGHT;

      if (dragMode === "move") {
        if (!disableReorder) {
          const newRow = rowIndex + Math.round(snappedTop / ROW_HEIGHT);
          if (newRow !== rowIndex) {
            onRowChange(rowIndex, newRow);
          }
        }

        const finalLeft = left + snappedLeft;
        const newStart = xToDate(finalLeft, rangeStart);
        const newStartStr = format(newStart, "yyyy-MM-dd");
        const newEndStr = endDate
          ? format(addDays(newStart, span - 1), "yyyy-MM-dd")
          : null;

        if (newStartStr !== schedule.startDate || newEndStr !== schedule.endDate) {
          onDateChange(schedule.id, newStartStr, newEndStr);
        }
      } else {
        const finalLeft = left + snappedLeft;
        const finalWidth = width + snappedWidth;
        const newStart = xToDate(finalLeft, rangeStart);
        const days = Math.max(1, Math.round(finalWidth / DAY_WIDTH));
        const newEnd = days > 1 ? addDays(newStart, days - 1) : null;

        const newStartStr = format(newStart, "yyyy-MM-dd");
        const newEndStr = newEnd ? format(newEnd, "yyyy-MM-dd") : null;
        if (newStartStr !== schedule.startDate || newEndStr !== schedule.endDate) {
          onDateChange(schedule.id, newStartStr, newEndStr);
        }
      }

      setDragMode(null);
      onDragEnd?.();
      setPreview({ left: 0, width: 0, top: 0 });
    },
    [dragMode, preview, left, width, rangeStart, schedule, startDate, endDate, span, rowIndex, onDateChange, onRowChange, onBarClick, onSplit, onDragEnd, disableReorder]
  );

  const displayLeft = left + preview.left;
  const displayWidth = width + preview.width;
  const displayTop = top + preview.top;
  const isDragging = dragMode !== null && dragStart.current.moved;

  return (
    <div
      ref={barRef}
      data-gantt-bar
      className={cn(
        "absolute flex items-center gap-1.5 px-2 rounded-md select-none",
        "hover:shadow-sm",
        color.bg,
        isDragging && "shadow-md z-10 opacity-90",
        !isDragging && "transition-[left,top,width] duration-100"
      )}
      style={{
        left: displayLeft,
        width: Math.max(displayWidth, DAY_WIDTH),
        top: displayTop,
        height: BAR_HEIGHT,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 좌측 리사이즈 핸들 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-l-md hover:bg-foreground/10"
        onPointerDown={(e) => handlePointerDown(e, "resize-left")}
      />

      {/* 바 본체 */}
      <div
        className={cn(
          "flex items-center gap-1.5 flex-1 min-w-0",
          splitPreview !== null ? "cursor-col-resize" : "cursor-grab active:cursor-grabbing"
        )}
        onPointerDown={(e) => handlePointerDown(e, "move")}
        onMouseMove={(e) => {
          const el = titleRef.current;
          if (el && el.scrollWidth > el.clientWidth) {
            const rect = el.getBoundingClientRect();
            setTooltip({ text: schedule.title, x: rect.left, y: rect.top });
          } else {
            setTooltip(null);
          }
          if ((e.metaKey || e.ctrlKey) && endDate && span >= 2 && barRef.current) {
            const rect = barRef.current.getBoundingClientRect();
            const boundary = Math.round((e.clientX - rect.left) / DAY_WIDTH);
            setSplitPreview(boundary >= 1 && boundary <= span - 1 ? boundary * DAY_WIDTH : null);
          } else {
            setSplitPreview(null);
          }
        }}
        onMouseLeave={() => { setTooltip(null); setSplitPreview(null); }}
      >
        <span ref={titleRef} className="text-xs truncate">{schedule.title}</span>
      </div>

      {/* 우측 리사이즈 핸들 */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-r-md hover:bg-foreground/10"
        onPointerDown={(e) => handlePointerDown(e, "resize-right")}
      />

      {/* 분할 프리뷰 */}
      {splitPreview !== null && (
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/50 pointer-events-none z-10"
          style={{ left: splitPreview }}
        />
      )}

      {/* truncate 시 툴팁 */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1 text-xs rounded-md bg-popover text-popover-foreground border border-border shadow-md animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ left: tooltip.x, top: tooltip.y - 32 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
