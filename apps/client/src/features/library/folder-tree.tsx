import { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Trash2,
  HardDrive,
} from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { useDroppable } from "@dnd-kit/core";
import { useFilesQuery } from "./api";
import type { FileItem } from "./types";

interface FolderTreeProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  showTrash?: boolean;
  onTrashClick?: () => void;
  isTrashActive?: boolean;
}

export function FolderTree({
  currentFolderId,
  onNavigate,
  showTrash,
  onTrashClick,
  isTrashActive,
}: FolderTreeProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b px-3 py-2">
        <span className="text-sm font-medium">폴더</span>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {/* 루트 */}
        <DroppableTreeItem
          droppableId="tree-root"
          folderId={null}
          label="전체 파일"
          icon={<HardDrive className="size-4" />}
          isActive={currentFolderId === null && !isTrashActive}
          onClick={() => onNavigate(null)}
        />

        {/* 루트 폴더들 */}
        <FolderChildren
          folderId={null}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
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
  depth,
}: {
  folderId: string | null;
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  depth: number;
}) {
  const { data: items } = useFilesQuery(folderId);
  const folders = items?.filter((f) => f.isFolder) ?? [];

  if (folders.length === 0) return null;

  return (
    <>
      {folders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
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
  depth,
}: {
  folder: FileItem;
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = currentFolderId === folder.id;

  return (
    <>
      <DroppableTreeItem
        droppableId={`tree-${folder.id}`}
        folderId={folder.id}
        label={folder.name}
        icon={
          expanded ? (
            <FolderOpen className="size-4" />
          ) : (
            <Folder className="size-4" />
          )
        }
        isActive={isActive}
        depth={depth}
        expandable
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onClick={() => onNavigate(folder.id)}
      />
      {expanded && (
        <FolderChildren
          folderId={folder.id}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
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
}: TreeItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
        isActive && "bg-accent font-medium",
        isDropTarget && "bg-primary/10 ring-1 ring-inset ring-primary"
      )}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={onClick}
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
      <span className="truncate">{label}</span>
    </div>
  );
}
