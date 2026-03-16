import { useState, useCallback, useRef, useMemo } from "react";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import {
  File as FileIcon,
  FolderPlus,
  Folder,
  FolderOpen,
  Eye,
  Download,
  Upload,
  Pencil,
  Trash2,
  ArrowUpDown,
  FolderInput,
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
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { FileUploadZone as FileUpload, UploadButton, uploadFiles } from "@/shared/ui/file-upload-zone";
import { FolderTree } from "./folder-tree";
import { TrashView } from "./trash";
import { useDrive } from "./use-drive";
import { useUploadFile } from "./api";
import type { FileItem } from "./types";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/shared/ui/resizable";
import type { PanelImperativeHandle } from "react-resizable-panels";
import {
  Breadcrumbs,
  ParentFolderRow,
  DraggableFileRow,
  DragOverlayContent,
  FileContextMenu,
  menuAction,
  menuSeparator,
  type MenuItem,
} from "@/shared/ui/file-browser";

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
    parentFolderFocused,
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
      if (targetFolderId === active.id) return;
      if (selectedIds.has(active.id as string) && targetFolderId && selectedIds.has(targetFolderId)) return;
      setMovingId(active.id as string);
      handleDragDrop(active.id as string, targetFolderId).then(() =>
        setMovingId(null)
      );
    },
    [handleDragDrop, handleDragToTrash, selectedIds]
  );

  // ─── 컨텍스트 메뉴 아이템 ───

  const menuItems: MenuItem[] = useMemo(() => {
    if (!contextMenu) return [];
    const { item, source } = contextMenu;
    const isMulti = isMultiSelection(item?.id);
    const hasClipboard = !!clipboard;

    // 빈 영역 우클릭
    if (!item) {
      return [
        menuAction(FolderPlus, "새 폴더", () => { setShowNewFolder(true); closeContextMenu(); }, { shortcut: "⇧N" }),
        menuAction(Upload, "파일 업로드", () => { uploadInputRef.current?.click(); closeContextMenu(); }),
        ...(hasClipboard ? [
          menuSeparator(),
          menuAction(ClipboardPaste, "붙여넣기", () => { handlePaste(); closeContextMenu(); }, { shortcut: "⌘V" }),
          menuAction(FolderInput, "잘라넣기", () => { handleMovePaste(); closeContextMenu(); }, { shortcut: "⌥⌘V" }),
        ] : []),
      ];
    }

    // 다중 선택
    if (isMulti) {
      return [
        menuAction(Copy, `${selectedIds.size}개 항목 복사`, () => { handleCopy(); closeContextMenu(); }, { shortcut: "⌘C" }),
        ...(hasClipboard ? [
          menuSeparator(),
          menuAction(ClipboardPaste, "붙여넣기", () => { handlePaste(); closeContextMenu(); }, { shortcut: "⌘V" }),
          menuAction(FolderInput, "잘라넣기", () => { handleMovePaste(); closeContextMenu(); }, { shortcut: "⌥⌘V" }),
        ] : []),
        menuSeparator(),
        menuAction(Trash2, `${selectedIds.size}개 항목 삭제`, () => { handleDelete(item.id); closeContextMenu(); }, { shortcut: "⌘⌫", variant: "destructive" }),
      ];
    }

    // 트리 소스
    if (source === "tree") {
      return [
        menuAction(Pencil, "이름 변경", () => { startRename(item.id, item.name, "tree"); closeContextMenu(); }, { shortcut: "⏎" }),
        menuAction(item.isFavorited ? StarOff : Star, item.isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가", () => { handleToggleFavorite(item.id, item.isFavorited); closeContextMenu(); }),
        menuSeparator(),
        menuAction(Trash2, "삭제", () => { handleDelete(item.id); closeContextMenu(); }, { shortcut: "⌘⌫", variant: "destructive" }),
      ];
    }

    // 즐겨찾기 소스
    if (source === "favorite") {
      return [
        menuAction(item.isFolder ? FolderOpen : Eye, "열기", () => { handleFileClick(item); closeContextMenu(); }, { shortcut: "⌘O" }),
        menuAction(StarOff, "즐겨찾기 해제", () => { handleToggleFavorite(item.id, item.isFavorited); closeContextMenu(); }),
        menuSeparator(),
        menuAction(Pencil, "이름 변경", () => { startRename(item.id, item.name, "favorite"); closeContextMenu(); }, { shortcut: "⏎" }),
      ];
    }

    // 리스트 소스 (기본)
    return [
      menuAction(item.isFolder ? FolderOpen : Eye, "열기", () => { handleFileClick(item); closeContextMenu(); }, { shortcut: "⌘O" }),
      ...(!item.isFolder ? [menuAction(Download, "다운로드", () => { window.open(`/api/files/${item.id}/download`, "_blank"); closeContextMenu(); })] : []),
      menuAction(item.isFavorited ? StarOff : Star, item.isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가", () => { handleToggleFavorite(item.id, item.isFavorited); closeContextMenu(); }),
      menuSeparator(),
      menuAction(Copy, "복사", () => { handleCopy(); closeContextMenu(); }, { shortcut: "⌘C" }),
      menuAction(CopyPlus, "복제", () => { handleDuplicate(); closeContextMenu(); }, { shortcut: "⌘D" }),
      ...(hasClipboard ? [
        menuAction(ClipboardPaste, "붙여넣기", () => { handlePaste(); closeContextMenu(); }, { shortcut: "⌘V" }),
        menuAction(FolderInput, "잘라넣기", () => { handleMovePaste(); closeContextMenu(); }, { shortcut: "⌥⌘V" }),
      ] : []),
      menuSeparator(),
      menuAction(Pencil, "이름 변경", () => { startRename(item.id, item.name, source ?? "list"); closeContextMenu(); }, { shortcut: "⏎" }),
      menuSeparator(),
      menuAction(Trash2, "삭제", () => { handleDelete(item.id); closeContextMenu(); }, { shortcut: "⌘⌫", variant: "destructive" }),
    ];
  }, [contextMenu, selectedIds, clipboard, isMultiSelection, closeContextMenu, setShowNewFolder, handlePaste, handleMovePaste, handleCopy, handleDelete, handleFileClick, handleDuplicate, handleToggleFavorite, startRename]);


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
            {/* 브레드크럼 + 트리 토글 */}
            <div className="flex min-w-0 items-center gap-1 border-b bg-muted/30 px-2 py-2 text-sm">
              <button
                className="-my-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => {
                  if (showTree) {
                    treePanelRef.current?.collapse();
                  } else {
                    treePanelRef.current?.expand();
                  }
                }}
              >
                {showTree ? (
                  <PanelLeftClose className="size-4" />
                ) : (
                  <PanelLeftOpen className="size-4" />
                )}
              </button>
              <Breadcrumbs
                breadcrumbs={breadcrumbs}
                onNavigate={navigateToBreadcrumb}
                className="border-0 bg-transparent px-0 py-0"
              />
            </div>

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
                if (e.target === e.currentTarget) {
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
                  focused={parentFolderFocused}
                  onClick={() =>
                    navigateToBreadcrumb(breadcrumbs.length - 2)
                  }
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
          <DragOverlayContent
            draggedItem={draggedItem}
            dragCount={dragCount}
            dragRowWidth={dragRowWidth}
          />
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
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={closeContextMenu}
        />
      )}
    </ResizablePanelGroup>
    </DndContext>
  );
}
