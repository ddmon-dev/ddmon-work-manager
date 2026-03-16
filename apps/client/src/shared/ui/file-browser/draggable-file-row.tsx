import { useState, useCallback, useRef } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/shared/utils/classnames";
import { formatFileSize } from "@/shared/utils/format";
import { getFileIconComponent, type FileItem } from "@/shared/lib/file-types";
import { MiddleTruncate } from "@/shared/ui/middle-truncate";
import { Input } from "@/shared/ui/input";

interface DraggableFileRowProps {
  item: FileItem;
  renamingId: string | null;
  renameValue: string;
  isMoving: boolean;
  isGroupDragging: boolean;
  isSelected: boolean;
  isDropDisabled: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onFileClick: (file: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  onRenameChange: (value: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
  onFocusSelect?: () => void;
  onDropUpload: (files: FileList, folderId: string) => void;
  compact?: boolean;
}

export function DraggableFileRow({
  item,
  renamingId,
  renameValue,
  isMoving,
  isGroupDragging,
  isSelected,
  isDropDisabled,
  onSelect,
  onFileClick,
  onContextMenu,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onFocusSelect,
  onDropUpload,
  compact,
}: DraggableFileRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({ id: item.id, disabled: renamingId === item.id });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `list-${item.id}`,
    data: { folderId: item.id },
    disabled: isDropDisabled,
  });

  const ref = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node);
      if (item.isFolder) setDropRef(node);
    },
    [setDragRef, setDropRef, item.isFolder]
  );

  // 네이티브 파일 드롭 (OS에서 파일을 폴더 위에 드롭)
  const [nativeDragOver, setNativeDragOver] = useState(false);
  const dragCounter = useRef(0);

  const nativeDragHandlers = item.isFolder
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          dragCounter.current++;
          setNativeDragOver(true);
        },
        onDragOver: (e: React.DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
        },
        onDragLeave: () => {
          dragCounter.current--;
          if (dragCounter.current === 0) setNativeDragOver(false);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          dragCounter.current = 0;
          setNativeDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            onDropUpload(e.dataTransfer.files, item.id);
          }
        },
      }
    : {};

  const iconSize = compact ? "size-4" : "size-5";

  return (
    <div
      ref={ref}
      {...attributes}
      {...listeners}
      role="option"
      aria-selected={isSelected}
      data-item-id={item.id}
      {...nativeDragHandlers}
      className={cn(
        "group flex cursor-grab items-center gap-3 outline-none active:cursor-grabbing",
        compact ? "px-3 py-3" : "border-b px-4 py-3",
        (isDragging || isMoving || isGroupDragging) && "opacity-30",
        (isOver || nativeDragOver) &&
          !isDropDisabled &&
          "bg-primary/10 ring-1 ring-inset ring-primary",
        isSelected
          ? "bg-primary/8 hover:bg-primary/12 dark:bg-primary/12 dark:hover:bg-primary/16"
          : "hover:bg-muted/50"
      )}
      onFocus={() => {
        if (!isSelected && onFocusSelect) onFocusSelect();
      }}
      onClick={(e) => {
        if (!isDragging) onSelect(e);
      }}
      onDoubleClick={() => {
        if (!isDragging) onFileClick(item);
      }}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      <span className="shrink-0">{getFileIconComponent(item, iconSize)}</span>

      <div className={cn("min-w-0 flex-1", renamingId === item.id ? "overflow-visible" : "overflow-hidden")}>
        {renamingId === item.id ? (
          <Input
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            className="h-auto! select-text rounded-sm border-0 px-1 py-0.5 text-sm shadow-none ring-1 ring-ring"
            autoFocus
            onFocus={(e) => {
              const input = e.currentTarget;
              if (item.isFolder) {
                input.select();
              } else {
                const dotIndex = input.value.lastIndexOf(".");
                input.setSelectionRange(0, dotIndex > 0 ? dotIndex : input.value.length);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") onRenameSubmit(item.id);
              if (e.key === "Escape") onRenameCancel();
            }}
            onBlur={() => onRenameSubmit(item.id)}
          />
        ) : (
          <MiddleTruncate className="text-sm">{item.name}</MiddleTruncate>
        )}
      </div>

      {compact ? (
        <>
          <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground md:inline">
            {item.isFolder ? "-" : item.size != null ? formatFileSize(item.size) : "-"}
          </span>
          <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground md:inline">
            {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
          </span>
        </>
      ) : (
        <>
          <span className="w-24 shrink-0 text-right text-sm text-muted-foreground">
            {item.isFolder ? "-" : item.size != null ? formatFileSize(item.size) : "-"}
          </span>
          <span className="w-28 shrink-0 text-right text-sm text-muted-foreground">
            {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
          </span>
        </>
      )}
    </div>
  );
}
