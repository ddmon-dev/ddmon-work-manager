import { Fragment, useState, useCallback, useRef, useEffect } from "react";
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
  Pencil,
  Trash2,
  ArrowUpDown,
  FolderInput,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  StarOff,
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
import { FileUploadZone as FileUpload, UploadButton, uploadFiles } from "@/shared/ui/file-upload-zone";
import { FolderTree } from "./folder-tree";
import { TrashView } from "./trash";
import { useDrive, type ContextMenuState, PARENT_ROW_ID } from "./use-drive";
import { useUploadFile } from "./api";
import { getFileIconComponent, type FileItem } from "./types";
import { MiddleTruncate } from "@/shared/ui/middle-truncate";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/shared/ui/resizable";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { ContextMenuPortal } from "@/shared/ui/context-menu-portal";
import type { LucideIcon } from "lucide-react";

export function Drive() {
  const {
    currentFolderId,
    showTrash,
    sort,
    order,
    newFolderName,
    showNewFolder,
    renaming,
    items,
    isLoading,
    breadcrumbs,
    setNewFolderName,
    setShowNewFolder,
    setRenameValue,
    setShowTrash,
    handleNavigate,
    navigateToBreadcrumb,
    handleCreateFolder,
    handleDelete,
    handleRename,
    handleFileClick,
    toggleSort,
    handleDragDrop,
    handleDragToTrash,
    handleToggleFavorite,
    handleCopy,
    handlePaste,
    handleMovePaste,
    handleDuplicate,
    openContextMenu,
    closeContextMenu,
    selectedIds,
    contextMenu,
    clipboard,
    selectItem,
    clearSelection,
    startRename,
    cancelRename,
    isMultiSelection,
    dragRect,
    dragContainerRef,
    handleDragSelectStart,
    wasDragSelectingRef,
    handleKeyDown,
  } = useDrive();

  const [showTree, setShowTree] = useState(true);
  const treePanelRef = useRef<PanelImperativeHandle>(null);
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragRowWidth, setDragRowWidth] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const uploadFile = useUploadFile();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLDivElement>(null);

  useClickOutside(newFolderRef, () => setShowNewFolder(false), showNewFolder);

  // 드래그 시 선택된 항목 수 (draggedItem이 selectedIds에 포함되면 전체, 아니면 1)
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
        if (!selectedIds.has(item.id)) {
          clearSelection();
        }
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

      // 휴지통 드롭
      if (over.data.current?.isTrash === true) {
        handleDragToTrash(active.id as string);
        return;
      }

      const targetFolderId = over.data.current?.folderId as
        | string
        | null
        | undefined;
      if (targetFolderId === undefined) return;
      // 자기 자신 또는 선택 그룹에 포함된 폴더에 드롭 차단
      if (targetFolderId === active.id) return;
      if (selectedIds.has(active.id as string) && targetFolderId && selectedIds.has(targetFolderId)) return;
      setMovingId(active.id as string);
      handleDragDrop(active.id as string, targetFolderId).then(() =>
        setMovingId(null)
      );
    },
    [handleDragDrop, handleDragToTrash, selectedIds]
  );


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      {/* 좌측: 폴더 트리 */}
      <ResizablePanel
        id="tree"
        panelRef={treePanelRef}
        defaultSize="20%"
        minSize="0px"
        maxSize="40%"
        collapsible
        collapsedSize="0px"
        onResize={() => {
          const collapsed = treePanelRef.current?.isCollapsed() ?? false;
          setShowTree(!collapsed);
        }}
      >
        <FolderTree
          currentFolderId={currentFolderId}
          onNavigate={handleNavigate}
          onFileClick={handleFileClick}
          showTrash
          onTrashClick={() => setShowTrash(true)}
          isTrashActive={showTrash}
          onContextMenu={(e, item) => openContextMenu(e, item, "tree")}
          onFavContextMenu={(e, item) => openContextMenu(e, item, "favorite")}
          renamingId={renaming?.source === "tree" ? renaming.id : null}
          favRenamingId={renaming?.source === "favorite" ? renaming.id : null}
          renameValue={renaming?.value ?? ""}
          onRenameChange={setRenameValue}
          onRenameSubmit={handleRename}
          onRenameCancel={cancelRename}
        />
      </ResizablePanel>
      <ResizableHandle className={cn(!showTree && "opacity-0")} />

      {/* 우측: 파일 목록 */}
      <ResizablePanel id="content">
      {showTrash ? (
        <div className="h-full">
          <TrashView />
        </div>
      ) : (
        <FileUpload folderId={currentFolderId}>
          <div className="flex h-full select-none flex-col">
            {/* 브레드크럼 */}
            <Breadcrumbs
              breadcrumbs={breadcrumbs}
              showTree={showTree}
              onToggleTree={() => {
                if (showTree) {
                  treePanelRef.current?.collapse();
                } else {
                  treePanelRef.current?.expand();
                }
              }}
              onNavigate={navigateToBreadcrumb}
            />

            {/* 상단 툴바 */}
            <div className="flex items-center gap-2 border-b px-4 py-2">
              {/* 선택 카운트 표시 */}
              {selectedIds.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size}개 선택
                </span>
              )}
              <div className="ml-auto flex gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <ArrowUpDown className="mr-1 size-3.5" />
                      정렬
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleSort("name")}>
                      이름순 {sort === "name" && (order === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("date")}>
                      날짜순 {sort === "date" && (order === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleSort("size")}>
                      크기순 {sort === "size" && (order === "asc" ? "↑" : "↓")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setShowNewFolder(true)}
                >
                  <FolderPlus className="mr-1 size-3.5" />
                  새 폴더
                </Button>

                <UploadButton folderId={currentFolderId} />
              </div>
            </div>

            {/* 파일 목록 */}
            <div
              ref={dragContainerRef}
              tabIndex={-1}
              onKeyDown={handleKeyDown}
              className="relative flex-1 overflow-y-auto outline-none hide-scrollbar"
              onMouseDown={handleDragSelectStart}
              onClick={(e) => {
                if (wasDragSelectingRef.current) {
                  wasDragSelectingRef.current = false;
                  return;
                }
                if (!(e.target as HTMLElement).closest("[data-item-id]")) {
                  clearSelection();
                }
              }}
              onContextMenu={(e) => {
                if (!(e.target as HTMLElement).closest("[data-item-id]")) {
                  openContextMenu(e, null);
                }
              }}
            >
              {/* ../ 상위 폴더 행 */}
              {!isLoading && currentFolderId && (
                <ParentFolderRow
                  parentFolderId={
                    breadcrumbs.length >= 2
                      ? breadcrumbs[breadcrumbs.length - 2].id
                      : null
                  }
                  isSelected={selectedIds.has(PARENT_ROW_ID)}
                  onClick={() => selectItem(PARENT_ROW_ID)}
                  onDoubleClick={() =>
                    navigateToBreadcrumb(breadcrumbs.length - 2)
                  }
                  onContextMenu={(e) => {
                    selectItem(PARENT_ROW_ID);
                    openContextMenu(e, null, "parent");
                  }}
                />
              )}

              {/* 새 폴더 입력 */}
              {showNewFolder && (
                <div
                  ref={newFolderRef}
                  className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2"
                >
                  <Folder className="size-5 text-blue-500" />
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="폴더 이름"
                    className="h-8 max-w-xs"
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
                      className="h-7"
                      onClick={handleCreateFolder}
                    >
                      생성
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => setShowNewFolder(false)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}

              {!isLoading && items?.length === 0 ? (
                <Empty className="h-full border-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileIcon />
                    </EmptyMedia>
                    <EmptyTitle>파일이 없습니다</EmptyTitle>
                    <EmptyDescription>
                      파일을 드래그 앤 드롭하거나 아래 버튼을 사용하세요.
                    </EmptyDescription>
                  </EmptyHeader>
                  <div className="flex gap-2">
                    <UploadButton folderId={currentFolderId} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewFolder(true)}
                    >
                      <FolderPlus className="mr-1 size-4" />
                      새 폴더
                    </Button>
                  </div>
                </Empty>
              ) : (
                <div role="listbox" aria-multiselectable aria-label="파일 목록">
                  {items?.map((item) => (
                    <DraggableFileRow
                      key={item.id}
                      item={item}
                      renamingId={renaming?.source === "list" ? renaming.id : null}
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
                        (!!draggedItem && (
                          item.id === draggedItem.id ||
                          (selectedIds.has(draggedItem.id) && selectedIds.has(item.id))
                        ))
                      }
                      onSelect={(e) => selectItem(item.id, e)}
                      onFileClick={handleFileClick}
                      onContextMenu={openContextMenu}
                      onRenameChange={setRenameValue}
                      onRenameSubmit={handleRename}
                      onRenameCancel={cancelRename}
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
        </FileUpload>
      )}
      </ResizablePanel>

      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {draggedItem && (
          <div
            className="animate-drag-pill-morph flex cursor-grabbing items-center gap-2.5 border bg-background"
            style={
              dragRowWidth
                ? ({ "--drag-row-width": `${dragRowWidth}px` } as React.CSSProperties)
                : undefined
            }
          >
            <DragOverlayIcon item={draggedItem} isMulti={dragCount > 1} />
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

      {/* 빈 영역 컨텍스트 메뉴에서 파일 업로드용 hidden input */}
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
          onToggleFavorite={(item) => {
            handleToggleFavorite(item.id, item.isFavorited);
            closeContextMenu();
          }}
          onRename={(item) => {
            const source = contextMenu?.source === "tree" ? "tree" : contextMenu?.source === "favorite" ? "favorite" : "list";
            startRename(item.id, item.name, source);
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
    </ResizablePanelGroup>
    </DndContext>
  );
}

// ─── DraggableFileRow ───

function DraggableFileRow({
  item,
  renamingId,
  renameValue,
  onFileClick,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  isMoving,
  isGroupDragging,
  isSelected,
  isDropDisabled,
  onSelect,
  onContextMenu,
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
  onRenameChange: (value: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
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
        "group flex cursor-grab items-center gap-3 border-b px-4 py-3 outline-none active:cursor-grabbing",
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
      <span className="shrink-0">{getFileIconComponent(item, "size-5")}</span>

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

      <span className="w-24 shrink-0 text-right text-sm text-muted-foreground">
        {item.isFolder ? "-" : item.size != null ? formatFileSize(item.size) : "-"}
      </span>

      <span className="w-28 shrink-0 text-right text-sm text-muted-foreground">
        {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
      </span>

    </div>
  );
}

// ─── ParentFolderRow (../) ───

function ParentFolderRow({
  parentFolderId,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  parentFolderId: string | null;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "parent-folder",
    data: { folderId: parentFolderId },
  });

  return (
    <div
      ref={setNodeRef}
      data-item-id={PARENT_ROW_ID}
      className={cn(
        "flex cursor-pointer items-center gap-3 border-b px-4 py-3 text-muted-foreground",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary",
        isSelected
          ? "bg-primary/8 hover:bg-primary/12 dark:bg-primary/12 dark:hover:bg-primary/16"
          : "hover:bg-muted/50"
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <CornerLeftUp className="size-5" />
      <span className="flex-1 text-sm">상위 폴더</span>
    </div>
  );
}

// ─── DragOverlayIcon ───

function DragOverlayIcon({ item, isMulti }: { item: FileItem; isMulti?: boolean }) {
  const className = "size-5 shrink-0";
  if (isMulti) return <Files className={cn(className, "text-muted-foreground")} />;
  return <>{getFileIconComponent(item, className)}</>;
}

// ─── FileContextMenu (ContextMenuPortal 사용) ───

function FileContextMenu({
  contextMenu,
  isMulti,
  multiCount,
  hasClipboard,
  onClose,
  onOpen,
  onDownload,
  onToggleFavorite,
  onRename,
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
  onToggleFavorite: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
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
    <ContextMenuPortal x={contextMenu.x} y={contextMenu.y} onClose={onClose} minWidth={180}>
      {item ? (
        isMulti ? (
          // 다중 선택 컨텍스트 메뉴
          <>
            <ContextMenuButton
              icon={Copy}
              label={`${multiCount}개 항목 복사`}
              shortcut="⌘C"
              onClick={onCopy}
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
          // 단건 컨텍스트 메뉴 (source별 분기)
          <>
            {contextMenu.source === "tree" ? (
              <>
                <ContextMenuButton
                  icon={Pencil}
                  label="이름 변경"
                  shortcut="⏎"
                  onClick={() => onRename(item)}
                />
                <ContextMenuButton
                  icon={item.isFavorited ? StarOff : Star}
                  label={item.isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                  onClick={() => onToggleFavorite(item)}
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
            ) : contextMenu.source === "favorite" ? (
              <>
                <ContextMenuButton
                  icon={item.isFolder ? FolderOpen : Eye}
                  label="열기"
                  shortcut="⌘O"
                  onClick={() => onOpen(item)}
                />
                <ContextMenuButton
                  icon={StarOff}
                  label="즐겨찾기 해제"
                  onClick={() => onToggleFavorite(item)}
                />
                <div className="my-1 h-px bg-border" />
                <ContextMenuButton
                  icon={Pencil}
                  label="이름 변경"
                  shortcut="⏎"
                  onClick={() => onRename(item)}
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
                <ContextMenuButton
                  icon={item.isFavorited ? StarOff : Star}
                  label={item.isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                  onClick={() => onToggleFavorite(item)}
                />
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
                <div className="my-1 h-px bg-border" />
                <ContextMenuButton
                  icon={Trash2}
                  label="삭제"
                  shortcut="⌘⌫"
                  variant="destructive"
                  onClick={() => onDelete(item)}
                />
              </>
            )}
          </>
        )
      ) : contextMenu.source === "parent" ? (
        hasClipboard && (
          <>
            <ContextMenuButton
              icon={ClipboardPaste}
              label="상위 폴더에 붙여넣기"
              shortcut="⌘V"
              onClick={onPaste}
            />
            <ContextMenuButton
              icon={FolderInput}
              label="상위 폴더에 잘라넣기"
              shortcut="⌥⌘V"
              onClick={onMovePaste}
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

// ─── Breadcrumbs ───

/** 깊이가 깊어지면 중간 경로를 "..."으로 축약. root + 마지막 2개는 항상 표시 */
function collapseBreadcrumbs(
  breadcrumbs: { id: string | null; name: string }[]
) {
  if (breadcrumbs.length <= 5) return breadcrumbs;

  // root + ... + 마지막 2개
  return [
    breadcrumbs[0],
    { id: "__ellipsis__", name: "..." },
    breadcrumbs[breadcrumbs.length - 2],
    breadcrumbs[breadcrumbs.length - 1],
  ];
}

function Breadcrumbs({
  breadcrumbs,
  showTree,
  onToggleTree,
  onNavigate,
}: {
  breadcrumbs: { id: string | null; name: string }[];
  showTree: boolean;
  onToggleTree: () => void;
  onNavigate: (index: number) => void;
}) {
  const collapsed = collapseBreadcrumbs(breadcrumbs);

  // collapsed → original index 매핑
  const getOriginalIndex = (collapsedIndex: number) => {
    if (breadcrumbs.length <= 5) return collapsedIndex;
    if (collapsedIndex === 0) return 0;
    if (collapsedIndex === 1) return -1; // ellipsis
    // 마지막 2개: collapsed[2] → breadcrumbs[-2], collapsed[3] → breadcrumbs[-1]
    return breadcrumbs.length - (collapsed.length - collapsedIndex);
  };

  return (
    <div className="flex min-w-0 items-center gap-1 border-b bg-muted/30 px-2 py-2 text-sm">
      <button
        className="-my-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={onToggleTree}
      >
        {showTree ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeftOpen className="size-4" />
        )}
      </button>
      {collapsed.map((crumb, i) => (
        <Fragment key={crumb.id ?? "root"}>
          {i > 0 && (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          )}
          {crumb.id === "__ellipsis__" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 text-muted-foreground hover:underline">
                  ...
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-w-[240px]">
                {breadcrumbs.slice(1, -1).map((mid, midIdx) => (
                  <DropdownMenuItem
                    key={mid.id}
                    title={mid.name}
                    onClick={() => onNavigate(midIdx + 1)}
                  >
                    <span className="truncate">{mid.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              className={cn(
                "max-w-[200px] shrink truncate hover:underline",
                i === collapsed.length - 1
                  ? "font-medium"
                  : "text-muted-foreground"
              )}
              title={crumb.name}
              onClick={() => onNavigate(getOriginalIndex(i))}
            >
              {crumb.name}
            </button>
          )}
        </Fragment>
      ))}
    </div>
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
        <span className="ml-auto text-xs text-muted-foreground">{shortcut}</span>
      )}
    </button>
  );
}
