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
  onDuplicate?: (schedule: ProjectScheduleDTO, newStartDate: string, newEndDate: string | null) => void;
  onDragRow?: (targetRow: number) => void;
  onDragEnd?: () => void;
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
  onDuplicate,
  onDragRow,
  onDragEnd,
  minRow,
  maxRow,
}: GanttBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [preview, setPreview] = useState({ left: 0, width: 0, top: 0 });
  const [duplicateOffset, setDuplicateOffset] = useState<number | null>(null);
  const dragStart = useRef({ x: 0, y: 0, originalLeft: 0, originalWidth: 0, moved: false });
  const dragAxis = useRef<"x" | "y" | null>(null);

  const startDate = parseISO(schedule.startDate);
  const endDate = schedule.endDate ? parseISO(schedule.endDate) : null;
  const span = endDate ? differenceInCalendarDays(endDate, startDate) + 1 : 1;

  const left = dateToX(startDate, rangeStart);
  const width = span * DAY_WIDTH;
  const top = rowIndex * ROW_HEIGHT + BAR_Y_OFFSET;
  const { color, label: categoryLabel } = getCategoryConfig(schedule.category, schedule.categoryColor);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mode: DragMode) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragMode(mode);
      dragStart.current = { x: e.clientX, y: e.clientY, originalLeft: left, originalWidth: width, moved: false };
      dragAxis.current = null;
      setPreview({ left: 0, width: 0, top: 0 });
    },
    [left, width]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragMode) return;
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;

      if (!dragStart.current.moved && (Math.abs(deltaX) > CLICK_THRESHOLD || Math.abs(deltaY) > CLICK_THRESHOLD)) {
        dragStart.current.moved = true;
        if (dragMode === "move") {
          dragAxis.current = Math.abs(deltaY) > Math.abs(deltaX) ? "y" : "x";
        }
      }

      if (dragMode === "move") {
        if (dragAxis.current === "y") {
          const lo = minRow ?? 0;
          const hi = maxRow ?? (totalRows - 1);
          const targetRow = Math.max(lo, Math.min(hi, rowIndex + Math.round(deltaY / ROW_HEIGHT)));
          const clampedRowDelta = (targetRow - rowIndex) * ROW_HEIGHT;
          setPreview({ left: 0, width: 0, top: clampedRowDelta });
          onDragRow?.(targetRow);
        } else if (e.altKey && onDuplicate) {
          setPreview({ left: 0, width: 0, top: 0 });
          setDuplicateOffset(deltaX);
        } else {
          setPreview({ left: deltaX, width: 0, top: 0 });
          setDuplicateOffset(null);
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
    [dragMode, rowIndex, totalRows, onDragRow, onDuplicate, minRow, maxRow]
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
          onBarClick(schedule, barRef.current.getBoundingClientRect());
        }
        return;
      }

      const snappedLeft = Math.round(preview.left / DAY_WIDTH) * DAY_WIDTH;
      const snappedWidth = Math.round(preview.width / DAY_WIDTH) * DAY_WIDTH;
      const snappedTop = Math.round(preview.top / ROW_HEIGHT) * ROW_HEIGHT;

      // 스냅 위치로 preview 고정 — optimistic update가 반영될 때까지 유지
      setPreview({ left: snappedLeft, width: snappedWidth, top: snappedTop });
      setDragMode(null);
      setDuplicateOffset(null);
      onDragEnd?.();

      if (dragMode === "move") {
        const newRow = rowIndex + Math.round(snappedTop / ROW_HEIGHT);
        const rowChanged = newRow !== rowIndex;
        if (rowChanged) {
          onRowChange(rowIndex, newRow);
        }

        const finalLeft = left + snappedLeft;
        const newStart = xToDate(finalLeft, rangeStart);
        const newStartStr = format(newStart, "yyyy-MM-dd");
        const newEndStr = endDate
          ? format(addDays(newStart, span - 1), "yyyy-MM-dd")
          : null;

        if (e.altKey && onDuplicate && duplicateOffset !== null) {
          const dupLeft = left + Math.round(duplicateOffset / DAY_WIDTH) * DAY_WIDTH;
          const dupStart = xToDate(dupLeft, rangeStart);
          const dupStartStr = format(dupStart, "yyyy-MM-dd");
          const dupEndStr = endDate ? format(addDays(dupStart, span - 1), "yyyy-MM-dd") : null;
          onDuplicate(schedule, dupStartStr, dupEndStr);
          // 복제 시 원본은 제자리 — preview 리셋
          setPreview({ left: 0, width: 0, top: 0 });
        } else if (newStartStr !== schedule.startDate || newEndStr !== schedule.endDate) {
          onDateChange(schedule.id, newStartStr, newEndStr);
        } else if (!rowChanged) {
          // 행도 날짜도 변경 없음 — preview 리셋
          setPreview({ left: 0, width: 0, top: 0 });
        }
        // rowChanged인 경우: 낙관적 업데이트 후 보정 코드가 preview를 정리
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
        } else {
          setPreview({ left: 0, width: 0, top: 0 });
        }
      }
    },
    [dragMode, preview, left, width, rangeStart, schedule, startDate, endDate, span, rowIndex, onDateChange, onRowChange, onBarClick, onDuplicate, onDragEnd, duplicateOffset]
  );

  // optimistic update로 데이터 위치가 변하면 preview를 보정하여 점프 방지
  // React의 "렌더 중 상태 조정" 패턴 — paint 전에 재렌더링됨
  const prevPosRef = useRef({ left, width, top });
  if (prevPosRef.current.left !== left || prevPosRef.current.width !== width || prevPosRef.current.top !== top) {
    if (dragMode === null && (preview.left !== 0 || preview.width !== 0 || preview.top !== 0)) {
      setPreview({
        left: preview.left - (left - prevPosRef.current.left),
        width: preview.width - (width - prevPosRef.current.width),
        top: preview.top - (top - prevPosRef.current.top),
      });
    }
    prevPosRef.current = { left, width, top };
  }

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
        isDragging && "shadow-md z-10 opacity-90",
      )}
      style={{
        left: displayLeft,
        width: Math.max(displayWidth, DAY_WIDTH),
        top: displayTop,
        height: BAR_HEIGHT,
        backgroundColor: `${color}20`,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseMove={(e) => {
        const el = tooltipRef.current;
        const rect = barRef.current?.getBoundingClientRect();
        if (el && rect) {
          el.style.left = `${e.clientX}px`;
          el.style.top = `${rect.top - 32}px`;
        }
      }}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 좌측 리사이즈 핸들 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-l-md hover:bg-foreground/10"
        onPointerDown={(e) => handlePointerDown(e, "resize-left")}
      />

      {/* 바 본체 */}
      <div
        className="flex items-center gap-1.5 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => handlePointerDown(e, "move")}
      >
        <span ref={titleRef} className="text-xs truncate">{schedule.title}</span>
      </div>

      {/* 우측 리사이즈 핸들 */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-r-md hover:bg-foreground/10"
        onPointerDown={(e) => handlePointerDown(e, "resize-right")}
      />

      {/* 복제 고스트 */}
      {duplicateOffset !== null && (
        <div
          className="absolute flex items-center gap-1.5 px-2 rounded-md pointer-events-none opacity-50 border border-dashed border-foreground/30"
          style={{ left: duplicateOffset, top: 0, width: displayWidth, height: BAR_HEIGHT, backgroundColor: `${color}20` }}
        >
          <span className="text-xs truncate">{schedule.title}</span>
        </div>
      )}

      {/* 호버 툴팁: 카테고리 · 제목 (드래그 중에는 숨김) */}
      {showTooltip && !isDragging && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-2.5 py-1 text-xs rounded-md bg-popover text-popover-foreground border border-border shadow-md pointer-events-none whitespace-nowrap"
          style={{ transform: "translateX(-50%)" }}
        >
          <span style={{ color }}>{categoryLabel}</span>
          <span className="text-muted-foreground mx-1">·</span>
          {schedule.title}
        </div>
      )}
    </div>
  );
}
