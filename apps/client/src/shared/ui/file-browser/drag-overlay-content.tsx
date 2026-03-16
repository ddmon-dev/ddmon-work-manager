import { Files } from "lucide-react";
import { getFileIconComponent, type FileItem } from "@/shared/lib/file-types";

interface DragOverlayContentProps {
  draggedItem: FileItem;
  dragCount: number;
  dragRowWidth: number | null;
  compact?: boolean;
}

export function DragOverlayContent({
  draggedItem,
  dragCount,
  dragRowWidth,
  compact,
}: DragOverlayContentProps) {
  const iconSize = compact ? "size-4" : "size-5";
  const isMulti = dragCount > 1;

  return (
    <div
      className="animate-drag-pill-morph flex cursor-grabbing items-center gap-2.5 border bg-background"
      style={
        dragRowWidth
          ? ({ "--drag-row-width": `${dragRowWidth}px` } as React.CSSProperties)
          : undefined
      }
    >
      {isMulti ? (
        <Files className={`${iconSize} shrink-0 text-muted-foreground`} />
      ) : (
        getFileIconComponent(draggedItem, iconSize)
      )}
      <span className="truncate text-sm font-medium">
        {isMulti ? `${dragCount}개 항목` : draggedItem.name}
      </span>
      {isMulti && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          {dragCount}
        </span>
      )}
    </div>
  );
}
