import { memo } from "react";
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { ROW_HEIGHT } from "./utils";

interface LaneRowProps {
  laneId: string;
  title: string;
  localIndex: number;
  scheduleCount: number;
  isHovered: boolean;
  isEditing: boolean;
  editingTitle: string;
  isDragging: boolean;
  showDropBefore: boolean;
  showDropAfter: boolean;
  onEditingTitleChange: (value: string) => void;
  onStartEdit: (laneId: string, title: string) => void;
  onSaveEdit: (laneId: string, title: string) => void;
  onCancelEdit: () => void;
  onDelete: (laneId: string, scheduleCount: number) => void;
  onAddBelow: (laneId: string, localIndex: number) => void;
  onPointerDown: (e: React.PointerEvent, laneId: string, localIndex: number) => void;
  isLast?: boolean;
  className?: string;
}

export const LaneRow = memo(function LaneRow({
  laneId,
  title,
  localIndex,
  scheduleCount,
  isHovered,
  isEditing,
  editingTitle,
  isDragging,
  showDropBefore,
  showDropAfter,
  onEditingTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onAddBelow,
  onPointerDown,
  isLast,
  className,
}: LaneRowProps) {
  return (
    <div className="relative">
      {showDropBefore && (
        <div className="absolute top-0 left-2 right-1 h-0.5 bg-primary z-10" />
      )}
      <div
        className={cn(
          "group flex items-center gap-1 pl-2 pr-1 border-b",
          isLast ? "border-border" : "border-border/30",
          isHovered && "bg-foreground/[0.02]",
          isDragging && "opacity-50",
          className,
        )}
        style={{ height: ROW_HEIGHT }}
      >
        <div
          className="shrink-0 cursor-grab p-0.5 touch-none"
          onPointerDown={(e) => onPointerDown(e, laneId, localIndex)}
        >
          <GripVerticalIcon className="size-3 text-muted-foreground" />
        </div>
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editingTitle}
            onChange={(e) => onEditingTitleChange(e.target.value)}
            onBlur={() => onSaveEdit(laneId, title)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") onSaveEdit(laneId, title);
              if (e.key === "Escape") onCancelEdit();
            }}
            className="flex-1 min-w-0 text-xs px-1 py-0.5 rounded border border-border bg-background outline-none focus:ring-1 focus:ring-primary/30"
          />
        ) : (
          <span
            className="flex-1 min-w-0 text-xs truncate text-muted-foreground cursor-text hover:text-foreground"
            onClick={() => onStartEdit(laneId, title)}
          >
            {title || "제목 없음"}
          </span>
        )}
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-opacity shrink-0"
          onClick={() => onDelete(laneId, scheduleCount)}
        >
          <Trash2Icon className="size-3 text-destructive" />
        </button>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-opacity shrink-0"
          title="아래에 행 추가"
          onClick={() => onAddBelow(laneId, localIndex)}
        >
          <PlusIcon className="size-3 text-muted-foreground" />
        </button>
      </div>
      {showDropAfter && (
        <div className="absolute bottom-0 left-2 right-1 h-0.5 bg-primary z-10" />
      )}
    </div>
  );
});
