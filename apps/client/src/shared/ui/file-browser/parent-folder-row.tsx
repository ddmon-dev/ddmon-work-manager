import { CornerLeftUp } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/shared/utils/classnames";

interface ParentFolderRowProps {
  parentFolderId: string | null;
  focused?: boolean;
  onClick: () => void;
  onFocusSelect?: () => void;
  compact?: boolean;
}

export function ParentFolderRow({
  parentFolderId,
  focused,
  onClick,
  onFocusSelect,
  compact,
}: ParentFolderRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "parent-folder",
    data: { folderId: parentFolderId },
  });

  return (
    <div
      ref={setNodeRef}
      data-parent-folder-row
      tabIndex={0}
      className={cn(
        "flex cursor-pointer items-center gap-3 outline-none text-muted-foreground hover:bg-accent/30",
        compact ? "px-3 py-3" : "border-b px-4 py-3",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary",
        focused && "bg-primary/8 dark:bg-primary/12",
      )}
      onFocus={() => {
        if (!focused && onFocusSelect) onFocusSelect();
      }}
      onDoubleClick={onClick}
    >
      <CornerLeftUp className={compact ? "size-4" : "size-5"} />
      <span className="flex-1 text-sm">상위 폴더</span>
    </div>
  );
}
