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
import { getColorConfig } from "../../schedules/constants";
import type { ScheduleDTO } from "../../schedules/types";

interface GanttBarProps {
  schedule: ScheduleDTO;
  rowIndex: number;
  rangeStart: Date;
  totalRows: number;
  onDateChange: (id: string, newStartDate: string, newEndDate: string | null) => void;
  onRowChange: (fromIndex: number, toIndex: number) => void;
  onBarClick: (schedule: ScheduleDTO, rect: DOMRect) => void;
}

type DragMode = "move" | "resize-left" | "resize-right" | null;

const CLICK_THRESHOLD = 4; // 이 이하 이동은 클릭으로 판정

export function GanttBar({
  schedule,
  rowIndex,
  rangeStart,
  totalRows,
  onDateChange,
  onRowChange,
  onBarClick,
}: GanttBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  // 드래그 중에는 픽셀 단위 (부드럽게), 놓을 때 스냅
  const [preview, setPreview] = useState({ left: 0, width: 0, top: 0 });
  const dragStart = useRef({ x: 0, y: 0, originalLeft: 0, originalWidth: 0, moved: false });

  const startDate = parseISO(schedule.startDate);
  const endDate = schedule.endDate ? parseISO(schedule.endDate) : null;
  const span = endDate ? differenceInCalendarDays(endDate, startDate) + 1 : 1;

  const left = dateToX(startDate, rangeStart);
  const width = span * DAY_WIDTH;
  const top = rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;
  const color = getColorConfig(schedule.color);

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

      // 움직임 감지
      if (Math.abs(deltaX) > CLICK_THRESHOLD || Math.abs(deltaY) > CLICK_THRESHOLD) {
        dragStart.current.moved = true;
      }

      if (dragMode === "move") {
        // 행 클램핑
        const targetRow = rowIndex + Math.round(deltaY / ROW_HEIGHT);
        const clampedRowDelta = (Math.max(0, Math.min(totalRows - 1, targetRow)) - rowIndex) * ROW_HEIGHT;
        setPreview({ left: deltaX, width: 0, top: clampedRowDelta });
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
    [dragMode, rowIndex, totalRows]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragMode) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      const wasDragged = dragStart.current.moved;

      if (!wasDragged) {
        // 클릭 → Popover 열기
        setDragMode(null);
        setPreview({ left: 0, width: 0, top: 0 });
        if (dragMode === "move" && barRef.current) {
          onBarClick(schedule, barRef.current.getBoundingClientRect());
        }
        return;
      }

      // 스냅 계산
      const snappedLeft = Math.round(preview.left / DAY_WIDTH) * DAY_WIDTH;
      const snappedWidth = Math.round(preview.width / DAY_WIDTH) * DAY_WIDTH;
      const snappedTop = Math.round(preview.top / ROW_HEIGHT) * ROW_HEIGHT;

      if (dragMode === "move") {
        // 행 변경
        const newRow = rowIndex + Math.round(snappedTop / ROW_HEIGHT);
        if (newRow !== rowIndex) {
          onRowChange(rowIndex, newRow);
        }

        // 날짜 변경
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
        // 리사이즈 → 스냅 후 날짜 계산
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
      setPreview({ left: 0, width: 0, top: 0 });
    },
    [dragMode, preview, left, width, rangeStart, schedule, endDate, span, rowIndex, onDateChange, onRowChange, onBarClick]
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

      {/* 바 본체 (드래그 이동) */}
      <div
        className="flex items-center gap-1.5 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => handlePointerDown(e, "move")}
      >
        <span className="text-xs truncate">{schedule.title}</span>
      </div>

      {/* 우측 리사이즈 핸들 */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-r-md hover:bg-foreground/10"
        onPointerDown={(e) => handlePointerDown(e, "resize-right")}
      />
    </div>
  );
}
