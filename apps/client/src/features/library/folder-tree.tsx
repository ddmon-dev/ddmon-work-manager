import { useState, useEffect, useCallback } from "react";
import {
  FolderOpen,
  ChevronRight,
  Trash2,
  HardDrive,
  Loader2,
  Star,
  Folder,
} from "lucide-react";
import { cn } from "@/shared/utils/classnames";
import { Input } from "@/shared/ui/input";
import { MiddleTruncate } from "@/shared/ui/middle-truncate";
import { useSortableReorder } from "@/shared/hooks";
import { DndContext, closestCenter, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useFilesQuery, useFilePathQuery, useFavoritesQuery, useReorderFavorites } from "./api";
import { getFileIconComponent, type FileItem } from "./types";

interface FolderTreeProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  onFileClick?: (item: FileItem) => void;
  showTrash?: boolean;
  onTrashClick?: () => void;
  isTrashActive?: boolean;
  onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
  onFavContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
  // 이름변경 (tree/favorite 통합)
  renamingId?: string | null;
  favRenamingId?: string | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: (id: string) => void;
  onRenameCancel?: () => void;
}

export function FolderTree({
  currentFolderId,
  onNavigate,
  onFileClick,
  showTrash,
  onTrashClick,
  isTrashActive,
  onContextMenu,
  onFavContextMenu,
  renamingId,
  favRenamingId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
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

      {/* 즐겨찾기 */}
      {showTrash && (
        <FavoritesList
          onNavigate={onNavigate}
          onFileClick={onFileClick}
          onContextMenu={onFavContextMenu}
          renamingId={favRenamingId}
          renameValue={renameValue}
          onRenameChange={onRenameChange}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
        />
      )}

      {/* 폴더 트리 */}
      <div className="min-h-0 flex-1 overflow-y-auto hide-scrollbar p-1 space-y-0.5" role="tree">
        {/* 루트 */}
        <DroppableTreeItem
          droppableId="tree-root"
          folderId={null}
          label="내 드라이브"
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
          renamingId={renamingId}
          renameValue={renameValue}
          onRenameChange={onRenameChange}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
          depth={0}
        />
      </div>

      {/* 휴지통 */}
      {showTrash && (
        <div className="border-t p-1">
          <DroppableTreeItem
            droppableId="trash-drop"
            folderId={null}
            droppableData={{ isTrash: true }}
            dropVariant="destructive"
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

function FavoritesList({
  onNavigate,
  onFileClick,
  onContextMenu,
  renamingId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: {
  onNavigate: (folderId: string | null) => void;
  onFileClick?: (item: FileItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
  renamingId?: string | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: (id: string) => void;
  onRenameCancel?: () => void;
}) {
  const { data: serverFavorites } = useFavoritesQuery();
  const [expanded, setExpanded] = useState(true);
  const reorderFavorites = useReorderFavorites();
  const { items: favorites, sensors, handleDragEnd } = useSortableReorder({
    serverData: serverFavorites,
    onReorder: (ids) => reorderFavorites.mutate(ids),
  });

  if (favorites.length === 0) return null;

  return (
    <div className="border-b">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60"
        onClick={() => setExpanded((v) => !v)}
      >
        <ChevronRight
          className={cn(
            "size-3 transition-transform",
            expanded && "rotate-90"
          )}
        />
        <Star className="size-3 fill-yellow-400 text-yellow-400" />
        <span>즐겨찾기</span>
      </button>
      {expanded && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={favorites.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-[200px] overflow-y-auto hide-scrollbar p-1 pt-0">
              {favorites.map((item) => (
                <SortableFavoriteItem
                  key={item.id}
                  item={item}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  onRenameChange={onRenameChange}
                  onRenameSubmit={onRenameSubmit}
                  onRenameCancel={onRenameCancel}
                  onNavigate={onNavigate}
                  onFileClick={onFileClick}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableFavoriteItem({
  item,
  renamingId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onNavigate,
  onFileClick,
  onContextMenu,
}: {
  item: FileItem;
  renamingId?: string | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: (id: string) => void;
  onRenameCancel?: () => void;
  onNavigate: (folderId: string | null) => void;
  onFileClick?: (item: FileItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, animateLayoutChanges: () => false });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isRenaming = renamingId === item.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/60 touch-none"
      )}
      {...attributes}
      {...listeners}
      role="treeitem"
      aria-level={1}
      onClick={
        isRenaming
          ? undefined
          : () => {
              if (item.isFolder) {
                onNavigate(item.id);
              } else {
                onFileClick?.(item);
              }
            }
      }
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, item) : undefined}
    >
      <span className="shrink-0">{getFileIconComponent(item, "size-4")}</span>
      {isRenaming ? (
        <Input
          value={renameValue ?? ""}
          onChange={(e) => onRenameChange?.(e.target.value)}
          className="h-auto! -my-0.5 min-w-0 flex-1 select-text rounded-sm border-0 px-1 py-0.5 text-sm shadow-none ring-1 ring-ring"
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") onRenameSubmit?.(item.id);
            if (e.key === "Escape") onRenameCancel?.();
          }}
          onBlur={() => onRenameSubmit?.(item.id)}
        />
      ) : (
        <MiddleTruncate className="min-w-0 flex-1 text-sm">
          {item.name}
        </MiddleTruncate>
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
  renamingId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  depth,
}: {
  folderId: string | null;
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
  renamingId?: string | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: (id: string) => void;
  onRenameCancel?: () => void;
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
          renamingId={renamingId}
          renameValue={renameValue}
          onRenameChange={onRenameChange}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
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
  renamingId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  depth,
}: {
  folder: FileItem;
  currentFolderId: string | null;
  onNavigate: (id: string | null) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, item: FileItem) => void;
  renamingId?: string | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: (id: string) => void;
  onRenameCancel?: () => void;
  depth: number;
}) {
  const isExpanded = expandedIds.has(folder.id);
  const isActive = currentFolderId === folder.id;

  return (
    <>
      <DroppableTreeItem
        droppableId={`tree-${folder.id}`}
        folderId={folder.id}
        label={renamingId === folder.id ? (renameValue ?? "") : folder.name}
        icon={
          isExpanded ? (
            <FolderOpen className="size-4" />
          ) : (
            <Folder className="size-4" />
          )
        }
        isActive={isActive}
        isRenaming={renamingId === folder.id}
        onRenameChange={onRenameChange}
        onRenameSubmit={() => onRenameSubmit?.(folder.id)}
        onRenameCancel={onRenameCancel}
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
          renamingId={renamingId}
          renameValue={renameValue}
          onRenameChange={onRenameChange}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
          depth={depth + 1}
        />
      )}
    </>
  );
}

function DroppableTreeItem({
  droppableId,
  folderId,
  droppableData,
  dropVariant,
  ...props
}: {
  droppableId: string;
  folderId: string | null;
  droppableData?: Record<string, unknown>;
  dropVariant?: "destructive";
} & TreeItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { folderId, ...droppableData },
  });

  return (
    <div ref={setNodeRef}>
      <TreeItem {...props} isDropTarget={isOver} dropVariant={isOver ? dropVariant : undefined} />
    </div>
  );
}

interface TreeItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isDropTarget?: boolean;
  dropVariant?: "destructive";
  isRenaming?: boolean;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
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
  dropVariant,
  isRenaming,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
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
        "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer",
        isActive
          ? "bg-primary/10 font-medium text-primary"
          : "hover:bg-muted/60",
        isDropTarget && (dropVariant === "destructive"
          ? "bg-destructive/10 ring-1 ring-inset ring-destructive"
          : "bg-primary/10 ring-1 ring-inset ring-primary")
      )}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={isRenaming ? undefined : onClick}
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
        depth > 0 && <span className="w-3.5 shrink-0" />
      )}
      <span className="shrink-0">{icon}</span>
      {isRenaming ? (
        <Input
          value={label}
          onChange={(e) => onRenameChange?.(e.target.value)}
          className="h-auto! -my-0.5 min-w-0 flex-1 select-text rounded-sm border-0 px-1 py-0.5 text-sm shadow-none ring-1 ring-ring"
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") onRenameSubmit?.();
            if (e.key === "Escape") onRenameCancel?.();
          }}
          onBlur={() => onRenameSubmit?.()}
        />
      ) : (
        <MiddleTruncate className="min-w-0 flex-1 text-sm">{label}</MiddleTruncate>
      )}
    </div>
  );
}
