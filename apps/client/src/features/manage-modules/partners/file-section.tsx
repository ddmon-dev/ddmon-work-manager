import { useState, useCallback, useRef } from "react";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import {
  File as FileIcon,
  Files,
  FolderPlus,
  Folder,
  FolderOpen,
  CornerLeftUp,
  Eye,
  Download,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpDown,
  FolderInput,
  ChevronRight,
  Copy,
  ClipboardPaste,
  CopyPlus,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/ui/empty";
import { cn } from "@/shared/utils/classnames";
import { formatFileSize } from "@/shared/utils/format";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  FileUploadZone,
  UploadButton,
  uploadFiles,
} from "@/shared/ui/file-upload-zone";
import { useUploadFile, type FileOwner } from "@/shared/lib/file-api";
import { getFileIconComponent, type FileItem } from "@/shared/lib/file-types";
import { MiddleTruncate } from "@/shared/ui/middle-truncate";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import { ContextMenuPortal } from "@/shared/ui/context-menu-portal";
import { FolderTreePicker } from "@/shared/ui/folder-tree-picker";
import {
  useFileBrowser,
  type ContextMenuState,
} from "@/shared/hooks/use-file-browser";
import type { LucideIcon } from "lucide-react";

interface FileSectionProps {
  partnerId: string;
  partnerName: string;
}

export function FileSection({ partnerId, partnerName }: FileSectionProps) {
  const owner: FileOwner = { ownerType: "partner", ownerId: partnerId };

  const {
    currentFolderId,
    sort,
    order,
    newFolderName,
    showNewFolder,
    renaming,
    items,
    isLoading,
    moveTargetIds,
    breadcrumbs,
    selectedIds,
    contextMenu,
    clipboard,
    setNewFolderName,
    setShowNewFolder,
    setRenameValue,
    setMoveTargetIds,
    handleNavigate,
    navigateToBreadcrumb,
    handleCreateFolder,
    handleDelete,
    handleRename,
    handleFileClick,
    toggleSort,
    handleMove,
    handleDragDrop,
    handleCopy,
    handlePaste,
    handleMovePaste,
    handleDuplicate,
    openContextMenu,
    closeContextMenu,
    selectItem,
    clearSelection,
    startMove,
    startRename,
    cancelRename,
    isMultiSelection,
    dragRect,
    dragContainerRef,
    handleDragSelectStart,
    wasDragSelectingRef,
  } = useFileBrowser({ owner, deleteMode: "permanent", rootLabel: partnerName });

  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string | null>(
    null
  );
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragRowWidth, setDragRowWidth] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const uploadFile = useUploadFile(owner);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLDivElement>(null);

  useClickOutside(newFolderRef, () => setShowNewFolder(false), showNewFolder);

  const dragCount =
    draggedItem && selectedIds.has(draggedItem.id) ? selectedIds.size : 1;

  const handleDropUpload = useCallback(
    async (fileList: FileList, targetFolderId: string) => {
      await uploadFiles(Array.from(fileList), targetFolderId, uploadFile);
    },
    [uploadFile]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const item = items?.find((i) => i.id === event.active.id);
      if (item) {
        setDraggedItem(item);
        if (!selectedIds.has(item.id)) clearSelection();
        const width = event.active.rect.current?.initial?.width;
        if (width) setDragRowWidth(width);
      }
    },
    [items, selectedIds, clearSelection]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedItem(null);
      setDragRowWidth(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const targetFolderId = over.data.current?.folderId as
        | string
        | null
        | undefined;
      if (targetFolderId === undefined) return;
      if (targetFolderId === active.id) return;
      if (
        selectedIds.has(active.id as string) &&
        targetFolderId &&
        selectedIds.has(targetFolderId)
      )
        return;
      setMovingId(active.id as string);
      handleDragDrop(active.id as string, targetFolderId).then(() =>
        setMovingId(null)
      );
    },
    [handleDragDrop, selectedIds]
  );

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <FileUploadZone folderId={currentFolderId} owner={owner}>
          <div className="flex select-none flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">파일</h3>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size}개 선택
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="xs">
                      <ArrowUpDown className="size-3" />
                      정렬
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleSort("name")}>
                      이름순{" "}
                      {sort === "name" && (order === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("date")}>
                      날짜순{" "}
                      {sort === "date" && (order === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("size")}>
                      크기순{" "}
                      {sort === "size" && (order === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowNewFolder(true)}
                >
                  <FolderPlus className="size-3" />
                  새 폴더
                </Button>
                <UploadButton folderId={currentFolderId} owner={owner} size="xs" />
              </div>
            </div>

            {/* 파일 목록 */}
            <div
              ref={dragContainerRef}
              className="relative mt-2 divide-y rounded-md border"
              onMouseDown={handleDragSelectStart}
              onClick={(e) => {
                if (wasDragSelectingRef.current) {
                  wasDragSelectingRef.current = false;
                  return;
                }
                if (e.target === e.currentTarget) clearSelection();
              }}
              onContextMenu={(e) => {
                if (e.target === e.currentTarget) openContextMenu(e, null);
              }}
            >
              {/* 브레드크럼 */}
              <nav className="flex items-center gap-1 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                {breadcrumbs.map((crumb, i) => (
                  <span
                    key={crumb.id ?? "root"}
                    className="flex items-center gap-1"
                  >
                    {i > 0 && <ChevronRight className="size-3" />}
                    {i === breadcrumbs.length - 1 ? (
                      <span className="font-medium text-foreground">
                        {crumb.name}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigateToBreadcrumb(i)}
                        className="cursor-pointer hover:text-foreground"
                      >
                        {crumb.name}
                      </button>
                    )}
                  </span>
                ))}
              </nav>

              {/* 상위 폴더 */}
              {!isLoading && currentFolderId && (
                <ParentFolderRow
                  parentFolderId={
                    breadcrumbs.length >= 2
                      ? breadcrumbs[breadcrumbs.length - 2].id
                      : null
                  }
                  onClick={() =>
                    navigateToBreadcrumb(breadcrumbs.length - 2)
                  }
                />
              )}

              {/* 새 폴더 입력 */}
              {showNewFolder && (
                <div
                  ref={newFolderRef}
                  className="flex items-center gap-2 bg-muted/30 px-3 py-1.5"
                >
                  <Folder className="size-4 text-blue-500" />
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="폴더 이름"
                    className="h-7 max-w-xs text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") setShowNewFolder(false);
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleCreateFolder}
                    >
                      생성
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setShowNewFolder(false)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}

              {!isLoading && items?.length === 0 && !showNewFolder ? (
                <div className="py-8">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FileIcon />
                      </EmptyMedia>
                      <EmptyTitle>파일이 없습니다</EmptyTitle>
                      <EmptyDescription>
                        파일을 업로드하거나 폴더를 생성하세요
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <div
                  role="listbox"
                  aria-multiselectable
                  aria-label="파일 목록"
                  className="divide-y"
                >
                  {items?.map((item) => (
                    <DraggableFileRow
                      key={item.id}
                      item={item}
                      renamingId={
                        renaming?.source === "list" ? renaming.id : null
                      }
                      renameValue={renaming?.value ?? ""}
                      isMoving={item.id === movingId}
                      isGroupDragging={
                        !!draggedItem &&
                        selectedIds.has(draggedItem.id) &&
                        selectedIds.has(item.id)
                      }
                      isSelected={selectedIds.has(item.id)}
                      isDropDisabled={
                        !item.isFolder ||
                        (!!draggedItem &&
                          (item.id === draggedItem.id ||
                            (selectedIds.has(draggedItem.id) &&
                              selectedIds.has(item.id))))
                      }
                      onSelect={(e) => selectItem(item.id, e)}
                      onFileClick={handleFileClick}
                      onContextMenu={openContextMenu}
                      onRenameStart={(id, name) =>
                        startRename(id, name, "list")
                      }
                      onRenameChange={setRenameValue}
                      onRenameSubmit={handleRename}
                      onRenameCancel={cancelRename}
                      onMoveStart={(id) => {
                        startMove(id);
                        setSelectedMoveFolder(currentFolderId);
                      }}
                      onDelete={handleDelete}
                      onDropUpload={handleDropUpload}
                    />
                  ))}
                </div>
              )}

              {/* 드래그 선택 사각형 */}
              {dragRect && (
                <div
                  className="pointer-events-none fixed z-10 border border-primary/50 bg-primary/10"
                  style={{
                    left: dragRect.x,
                    top: dragRect.y,
                    width: dragRect.width,
                    height: dragRect.height,
                  }}
                />
              )}
            </div>
          </div>
        </FileUploadZone>

        <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
          {draggedItem && (
            <div
              className="animate-drag-pill-morph flex cursor-grabbing items-center gap-2.5 border bg-background"
              style={
                dragRowWidth
                  ? ({
                      "--drag-row-width": `${dragRowWidth}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              {dragCount > 1 ? (
                <Files className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                getFileIconComponent(draggedItem, "size-4")
              )}
              <span className="truncate text-sm font-medium">
                {dragCount > 1
                  ? `${dragCount}개 항목`
                  : draggedItem.name}
              </span>
              {dragCount > 1 && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {dragCount}
                </span>
              )}
            </div>
          )}
        </DragOverlay>

        {/* 컨텍스트 메뉴용 hidden input */}
        <input
          ref={uploadInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            await uploadFiles(Array.from(files), currentFolderId, uploadFile);
            e.target.value = "";
          }}
        />

        {contextMenu && (
          <FileContextMenu
            contextMenu={contextMenu}
            isMulti={isMultiSelection(contextMenu.item?.id)}
            multiCount={selectedIds.size}
            hasClipboard={!!clipboard}
            onClose={closeContextMenu}
            onOpen={(item) => {
              handleFileClick(item);
              closeContextMenu();
            }}
            onDownload={(item) => {
              window.open(`/api/files/${item.id}/download`, "_blank");
              closeContextMenu();
            }}
            onRename={(item) => {
              startRename(item.id, item.name, "list");
              closeContextMenu();
            }}
            onMove={(item) => {
              startMove(item.id);
              setSelectedMoveFolder(currentFolderId);
              closeContextMenu();
            }}
            onDelete={(item) => {
              handleDelete(item.id);
              closeContextMenu();
            }}
            onCopy={() => {
              handleCopy();
              closeContextMenu();
            }}
            onPaste={() => {
              handlePaste();
              closeContextMenu();
            }}
            onMovePaste={() => {
              handleMovePaste();
              closeContextMenu();
            }}
            onDuplicate={() => {
              handleDuplicate();
              closeContextMenu();
            }}
            onNewFolder={() => {
              setShowNewFolder(true);
              closeContextMenu();
            }}
            onUpload={() => {
              uploadInputRef.current?.click();
              closeContextMenu();
            }}
          />
        )}
      </DndContext>

      {/* 이동 Dialog */}
      <Dialog
        open={moveTargetIds.length > 0}
        onOpenChange={(open) => !open && setMoveTargetIds([])}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moveTargetIds.length > 1
                ? `${moveTargetIds.length}개 항목 이동`
                : "이동할 폴더 선택"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <FolderTreePicker
              owner={owner}
              selectedFolderId={selectedMoveFolder}
              onSelect={setSelectedMoveFolder}
              excludeIds={moveTargetIds}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveTargetIds([])}>
              취소
            </Button>
            <Button
              onClick={() => {
                handleMove(selectedMoveFolder);
                setSelectedMoveFolder(null);
              }}
            >
              이동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── DraggableFileRow ───

function DraggableFileRow({
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
  onRenameStart,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onMoveStart,
  onDelete,
  onDropUpload,
}: {
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
  onRenameStart: (id: string, name: string) => void;
  onRenameChange: (value: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
  onMoveStart: (id: string) => void;
  onDelete: (id: string) => void;
  onDropUpload: (files: FileList, folderId: string) => void;
}) {
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
        "group flex cursor-grab items-center gap-3 px-3 py-1.5 outline-none active:cursor-grabbing",
        (isDragging || isMoving || isGroupDragging) && "opacity-30",
        (isOver || nativeDragOver) &&
          !isDropDisabled &&
          "bg-primary/10 ring-1 ring-inset ring-primary",
        isSelected
          ? "bg-primary/8 hover:bg-primary/12 dark:bg-primary/12 dark:hover:bg-primary/16"
          : "hover:bg-muted/50"
      )}
      onClick={(e) => {
        if (!isDragging) onSelect(e);
      }}
      onDoubleClick={() => {
        if (!isDragging) onFileClick(item);
      }}
      onContextMenu={(e) => onContextMenu(e, item)}
    >
      <span className="shrink-0">
        {getFileIconComponent(item, "size-4")}
      </span>

      <div
        className={cn(
          "min-w-0 flex-1",
          renamingId === item.id ? "overflow-visible" : "overflow-hidden"
        )}
      >
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
                input.setSelectionRange(
                  0,
                  dotIndex > 0 ? dotIndex : input.value.length
                );
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

      <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground md:inline">
        {item.isFolder
          ? "-"
          : item.size != null
            ? formatFileSize(item.size)
            : "-"}
      </span>

      <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground md:inline">
        {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRenameStart(item.id, item.name);
            }}
          >
            <Pencil className="mr-2 size-3.5" />
            이름 변경
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onMoveStart(item.id);
            }}
          >
            <FolderInput className="mr-2 size-3.5" />
            이동
          </DropdownMenuItem>
          {!item.isFolder && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/api/files/${item.id}/download`, "_blank");
              }}
            >
              <Download className="mr-2 size-3.5" />
              다운로드
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="text-destructive"
          >
            <Trash2 className="mr-2 size-3.5" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── ParentFolderRow ───

function ParentFolderRow({
  parentFolderId,
  onClick,
}: {
  parentFolderId: string | null;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "parent-folder",
    data: { folderId: parentFolderId },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex cursor-pointer items-center gap-3 px-3 py-1.5 text-muted-foreground hover:bg-accent/30",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary"
      )}
      onDoubleClick={onClick}
    >
      <CornerLeftUp className="size-4" />
      <span className="flex-1 text-sm">상위 폴더</span>
    </div>
  );
}

// ─── FileContextMenu ───

function FileContextMenu({
  contextMenu,
  isMulti,
  multiCount,
  hasClipboard,
  onClose,
  onOpen,
  onDownload,
  onRename,
  onMove,
  onDelete,
  onCopy,
  onPaste,
  onMovePaste,
  onDuplicate,
  onNewFolder,
  onUpload,
}: {
  contextMenu: ContextMenuState;
  isMulti: boolean;
  multiCount: number;
  hasClipboard: boolean;
  onClose: () => void;
  onOpen: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onCopy: () => void;
  onPaste: () => void;
  onMovePaste: () => void;
  onDuplicate: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
}) {
  const { item } = contextMenu;

  return (
    <ContextMenuPortal
      x={contextMenu.x}
      y={contextMenu.y}
      onClose={onClose}
      minWidth={180}
    >
      {item ? (
        isMulti ? (
          <>
            <ContextMenuButton
              icon={Copy}
              label={`${multiCount}개 항목 복사`}
              shortcut="⌘C"
              onClick={onCopy}
            />
            <ContextMenuButton
              icon={FolderInput}
              label={`${multiCount}개 항목 이동`}
              onClick={() => onMove(item)}
            />
            {hasClipboard && (
              <>
                <div className="my-1 h-px bg-border" />
                <ContextMenuButton
                  icon={ClipboardPaste}
                  label="붙여넣기"
                  shortcut="⌘V"
                  onClick={onPaste}
                />
                <ContextMenuButton
                  icon={FolderInput}
                  label="잘라넣기"
                  shortcut="⌥⌘V"
                  onClick={onMovePaste}
                />
              </>
            )}
            <div className="my-1 h-px bg-border" />
            <ContextMenuButton
              icon={Trash2}
              label={`${multiCount}개 항목 삭제`}
              shortcut="⌘⌫"
              variant="destructive"
              onClick={() => onDelete(item)}
            />
          </>
        ) : (
          <>
            <ContextMenuButton
              icon={item.isFolder ? FolderOpen : Eye}
              label="열기"
              shortcut="⌘O"
              onClick={() => onOpen(item)}
            />
            {!item.isFolder && (
              <ContextMenuButton
                icon={Download}
                label="다운로드"
                onClick={() => onDownload(item)}
              />
            )}
            <div className="my-1 h-px bg-border" />
            <ContextMenuButton
              icon={Copy}
              label="복사"
              shortcut="⌘C"
              onClick={onCopy}
            />
            <ContextMenuButton
              icon={CopyPlus}
              label="복제"
              shortcut="⌘D"
              onClick={onDuplicate}
            />
            {hasClipboard && (
              <>
                <ContextMenuButton
                  icon={ClipboardPaste}
                  label="붙여넣기"
                  shortcut="⌘V"
                  onClick={onPaste}
                />
                <ContextMenuButton
                  icon={FolderInput}
                  label="잘라넣기"
                  shortcut="⌥⌘V"
                  onClick={onMovePaste}
                />
              </>
            )}
            <div className="my-1 h-px bg-border" />
            <ContextMenuButton
              icon={Pencil}
              label="이름 변경"
              shortcut="⏎"
              onClick={() => onRename(item)}
            />
            <ContextMenuButton
              icon={FolderInput}
              label="이동"
              onClick={() => onMove(item)}
            />
            <div className="my-1 h-px bg-border" />
            <ContextMenuButton
              icon={Trash2}
              label="삭제"
              shortcut="⌘⌫"
              variant="destructive"
              onClick={() => onDelete(item)}
            />
          </>
        )
      ) : (
        <>
          <ContextMenuButton
            icon={FolderPlus}
            label="새 폴더"
            shortcut="⇧N"
            onClick={onNewFolder}
          />
          <ContextMenuButton
            icon={Upload}
            label="파일 업로드"
            onClick={onUpload}
          />
          {hasClipboard && (
            <>
              <div className="my-1 h-px bg-border" />
              <ContextMenuButton
                icon={ClipboardPaste}
                label="붙여넣기"
                shortcut="⌘V"
                onClick={onPaste}
              />
              <ContextMenuButton
                icon={FolderInput}
                label="잘라넣기"
                shortcut="⌥⌘V"
                onClick={onMovePaste}
              />
            </>
          )}
        </>
      )}
    </ContextMenuPortal>
  );
}

// ─── ContextMenuButton ───

function ContextMenuButton({
  icon: Icon,
  label,
  shortcut,
  variant,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  variant?: "destructive";
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        variant === "destructive" && "text-destructive hover:text-destructive"
      )}
      onClick={onClick}
    >
      <Icon className="size-3.5" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="ml-auto text-xs text-muted-foreground">
          {shortcut}
        </span>
      )}
    </button>
  );
}
