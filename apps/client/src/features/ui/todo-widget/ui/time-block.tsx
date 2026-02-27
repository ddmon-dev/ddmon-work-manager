import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Square, CheckSquare, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/utils/classnames";
import { useTodo } from "../context";
import { TODO_COLORS, TODO_COLOR_STYLES } from "../types";
import type { TimeBlockWithTodo, TodoColor } from "../types";

const SLOT_HEIGHT = 32;
const BLOCK_INSET = 2;
const MIN_SLOTS = 1;

interface TimeBlockProps {
  block: TimeBlockWithTodo;
}

export function TimeBlock({ block }: TimeBlockProps) {
  const { resizeBlock, removeBlock, toggleComplete, updateColor } = useTodo();
  const resizeStartY = useRef<number | null>(null);
  const resizeStartSlots = useRef<number>(block.durationSlots);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `block-${block.id}`,
    });

  const color = (block.todo.color ?? "slate") as TodoColor;
  const colorStyle = TODO_COLOR_STYLES[color] ?? TODO_COLOR_STYLES.slate;
  const isCompleted = block.todo.completed;

  const style = {
    top: `${block.startSlot * SLOT_HEIGHT + BLOCK_INSET}px`,
    height: `${block.durationSlots * SLOT_HEIGHT - BLOCK_INSET * 2}px`,
    transform: CSS.Translate.toString(transform),
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeStartY.current = e.clientY;
    resizeStartSlots.current = block.durationSlots;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (resizeStartY.current === null) return;
    const delta = e.clientY - resizeStartY.current;
    const slotDelta = Math.round(delta / SLOT_HEIGHT);
    const newDuration = Math.max(
      MIN_SLOTS,
      resizeStartSlots.current + slotDelta
    );
    if (block.startSlot + newDuration <= 48) {
      resizeBlock(block.id, newDuration);
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    resizeStartY.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "absolute left-0 right-2 rounded-md border px-1.5 py-0.5 select-none cursor-grab active:cursor-grabbing overflow-hidden",
        colorStyle.block,
        colorStyle.text,
        isCompleted && "opacity-50",
        isDragging && "opacity-40 z-50"
      )}
      {...listeners}
      {...attributes}
    >
      {/* 상단 컨트롤 행 */}
      <div className="flex items-center gap-0.5">
        {/* 색상 선택 dot */}
        <div onPointerDown={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-2 w-2 rounded-full shrink-0 transition-transform hover:scale-125 focus:outline-none",
                  colorStyle.dot
                )}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="left">
              <div className="flex gap-1.5 flex-wrap max-w-[120px]">
                {TODO_COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      "h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none",
                      TODO_COLOR_STYLES[c].dot,
                      color === c &&
                        "ring-2 ring-offset-1 ring-foreground scale-110"
                    )}
                    onClick={() => updateColor(block.todo.id, c)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 내용 */}
        <span className="text-xs font-medium leading-snug truncate flex-1 mx-0.5">
          {block.todo.content}
        </span>

        {/* 완료 토글 */}
        <div onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              toggleComplete(block.todo.id);
            }}
          >
            {isCompleted ? (
              <CheckSquare className="h-3 w-3" />
            ) : (
              <Square className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* 제거 */}
        <div onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(block.id);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 지속 시간 레이블 */}
      {block.durationSlots >= 2 && (
        <span className="text-[10px] opacity-60 pl-2.5">
          {block.durationSlots * 30}분
        </span>
      )}

      {/* 리사이즈 핸들 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
      />
    </div>
  );
}
