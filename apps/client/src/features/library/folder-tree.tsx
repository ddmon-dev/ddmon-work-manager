import { useState, useEffect, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Trash2,
  HardDrive,
  Loader2,
} from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { useDroppable } from "@dnd-kit/core";
import { useFilesQuery, useFilePathQuery } from "./api";
import type { FileItem } from "./types";

interface FolderTreeProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  showTrash?: boolean;
  onTrashClick?: () => void;
  isTrashActive?: boolean;
  onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
}

export function FolderTree({
  currentFolderId,
  onNavigate,
  showTrash,
  onTrashClick,
  isTrashActive,
  onContextMenu,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // currentFolderId 변경 시 조상 폴더 자동 확장
  const { data: path } = useFilePathQuery(currentFolderId);

  useEffect(() => {
    if (!path || path.length === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const ancestor of path) {
        next.add(ancestor.id);
      }
      return next;
    });
  }, [path]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleNavigateAndExpand = useCallback(
    (folderId: string | null) => {
      if (folderId) {
        setExpandedIds((prev) => new Set(prev).add(folderId));
      }
      onNavigate(folderId);
    },
    [onNavigate]
  );

  return (
    <div className="flex h-full select-none flex-col">
      <div className="flex items-center border-b px-3 py-2">
        <span className="text-sm font-medium">폴더</span>
      </div>
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5" role="tree">
        {/* 루트 */}
        <DroppableTreeItem
          droppableId="tree-root"
          folderId={null}
          label="전체 파일"
          icon={<HardDrive className="size-4" />}
          isActive={currentFolderId === null && !isTrashActive}
          onClick={() => onNavigate(null)}
          ariaLevel={1}
        />

        {/* 루트 폴더들 */}
        <FolderChildren
          folderId={null}
          currentFolderId={currentFolderId}
          onNavigate={handleNavigateAndExpand}
          expandedIds={expandedIds}
          onToggle={toggleExpand}
          onContextMenu={onContextMenu}
          depth={1}
        />
      </div>

      {/* 휴지통 */}
      {showTrash && (
        <div className="border-t p-1">
          <TreeItem
            label="휴지통"
            icon={<Trash2 className="size-4" />}
            isActive={!!isTrashActive}
            onClick={onTrashClick}
          />
        </div>
      )}
    </div>
  );
}

function FolderChildren({
  folderId,
  currentFolderId,
  onNavigate,
  expandedIds,
  onToggle,
  onContextMenu,
  depth,
}: {
  folderId: string | null;
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
  depth: number;
}) {
  const { data: items, isLoading } = useFilesQuery(folderId);
  const folders = items?.filter((f) => f.isFolder) ?? [];

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-1.5 py-1.5 text-muted-foreground"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <Loader2 className="size-3.5 animate-spin" />
        <span className="text-xs">로딩 중...</span>
      </div>
    );
  }

  if (folders.length === 0) return null;

  return (
    <>
      {folders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onContextMenu={onContextMenu}
          depth={depth}
        />
      ))}
    </>
  );
}

function FolderNode({
  folder,
  currentFolderId,
  onNavigate,
  expandedIds,
  onToggle,
  onContextMenu,
  depth,
}: {
  folder: FileItem;
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
  depth: number;
}) {
  const isExpanded = expandedIds.has(folder.id);
  const isActive = currentFolderId === folder.id;

  return (
    <>
      <DroppableTreeItem
        droppableId={`tree-${folder.id}`}
        folderId={folder.id}
        label={folder.name}
        icon={
          isExpanded ? (
            <FolderOpen className="size-4" />
          ) : (
            <Folder className="size-4" />
          )
        }
        isActive={isActive}
        depth={depth}
        expandable
        expanded={isExpanded}
        onToggle={() => onToggle(folder.id)}
        onClick={() => onNavigate(folder.id)}
        onContextMenu={
          onContextMenu ? (e) => onContextMenu(e, folder) : undefined
        }
        ariaLevel={depth + 1}
      />
      {isExpanded && (
        <FolderChildren
          folderId={folder.id}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onContextMenu={onContextMenu}
          depth={depth + 1}
        />
      )}
    </>
  );
}

function DroppableTreeItem({
  droppableId,
  folderId,
  ...props
}: {
  droppableId: string;
  folderId: string | null;
} & TreeItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { folderId },
  });

  return (
    <div ref={setNodeRef}>
      <TreeItem {...props} isDropTarget={isOver} />
    </div>
  );
}

interface TreeItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isDropTarget?: boolean;
  depth?: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  ariaLevel?: number;
}

function TreeItem({
  label,
  icon,
  isActive,
  isDropTarget,
  depth = 0,
  expandable,
  expanded,
  onToggle,
  onClick,
  onContextMenu,
  ariaLevel,
}: TreeItemProps) {
  return (
    <div
      role="treeitem"
      aria-expanded={expandable ? expanded : undefined}
      aria-level={ariaLevel}
      aria-selected={isActive}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
        isActive && "bg-accent font-medium",
        isDropTarget && "bg-primary/10 ring-1 ring-inset ring-primary"
      )}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {expandable ? (
        <button
          type="button"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-90"
            )}
          />
        </button>
      ) : (
        <span className="w-3.5" />
      )}
      {icon}
      <span className="truncate" title={label}>
        {label}
      </span>
    </div>
  );
}
