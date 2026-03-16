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
import {
  FileUploadZone,
  UploadButton,
  uploadFiles,
} from "@/shared/ui/file-upload-zone";
import { useUploadFile, type FileOwner } from "@/shared/lib/file-api";
import type { FileItem } from "@/shared/lib/file-types";
import { useClickOutside } from "@/shared/hooks/use-click-outside";
import {
  useFileBrowser,
} from "@/shared/hooks/use-file-browser";
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

interface FileSectionProps {
  owner: FileOwner;
  ownerName: string;
  deleteMode?: "soft" | "permanent";
}

export function FileSection({ owner, ownerName, deleteMode = "permanent" }: FileSectionProps) {
  const {
    currentFolderId,
    sort,
    order,
    newFolderName,
    showNewFolder,
    renaming,
    items,
    isLoading,
    breadcrumbs,
    selectedIds,
    contextMenu,
    parentFolderFocused,
    clipboard,
    setNewFolderName,
    setShowNewFolder,
    setRenameValue,
    handleNavigate,
    navigateToBreadcrumb,
    handleCreateFolder,
    handleDelete,
    handleRename,
    handleFileClick,
    toggleSort,
    handleDragDrop,
    handleCopy,
    handlePaste,
    handleMovePaste,
    handleDuplicate,
    openContextMenu,
    closeContextMenu,
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
  } = useFileBrowser({ owner, deleteMode, rootLabel: ownerName });

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

  // ─── 컨텍스트 메뉴 아이템 ───

  const menuItems: MenuItem[] = useMemo(() => {
    if (!contextMenu) return [];
    const { item } = contextMenu;
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

    // 단건
    return [
      menuAction(item.isFolder ? FolderOpen : Eye, "열기", () => { handleFileClick(item); closeContextMenu(); }, { shortcut: "⌘O" }),
      ...(!item.isFolder ? [menuAction(Download, "다운로드", () => { window.open(`/api/files/${item.id}/download`, "_blank"); closeContextMenu(); })] : []),
      menuSeparator(),
      menuAction(Copy, "복사", () => { handleCopy(); closeContextMenu(); }, { shortcut: "⌘C" }),
      menuAction(CopyPlus, "복제", () => { handleDuplicate(); closeContextMenu(); }, { shortcut: "⌘D" }),
      ...(hasClipboard ? [
        menuAction(ClipboardPaste, "붙여넣기", () => { handlePaste(); closeContextMenu(); }, { shortcut: "⌘V" }),
        menuAction(FolderInput, "잘라넣기", () => { handleMovePaste(); closeContextMenu(); }, { shortcut: "⌥⌘V" }),
      ] : []),
      menuSeparator(),
      menuAction(Pencil, "이름 변경", () => { startRename(item.id, item.name, "list"); closeContextMenu(); }, { shortcut: "⏎" }),
      menuSeparator(),
      menuAction(Trash2, "삭제", () => { handleDelete(item.id); closeContextMenu(); }, { shortcut: "⌘⌫", variant: "destructive" }),
    ];
  }, [contextMenu, selectedIds, clipboard, isMultiSelection, closeContextMenu, setShowNewFolder, handlePaste, handleMovePaste, handleCopy, handleDelete, handleFileClick, handleDuplicate, startRename]);

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
              tabIndex={-1}
              onKeyDown={handleKeyDown}
              className="relative mt-2 divide-y rounded-md border outline-none"
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
              {/* 브레드크럼 */}
              <Breadcrumbs
                breadcrumbs={breadcrumbs}
                onNavigate={navigateToBreadcrumb}
                compact
              />

              {/* 상위 폴더 */}
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
                  compact
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
                      onRenameChange={setRenameValue}
                      onRenameSubmit={handleRename}
                      onRenameCancel={cancelRename}
                      onDropUpload={handleDropUpload}
                      compact
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
            <DragOverlayContent
              draggedItem={draggedItem}
              dragCount={dragCount}
              dragRowWidth={dragRowWidth}
              compact
            />
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
            x={contextMenu.x}
            y={contextMenu.y}
            items={menuItems}
            onClose={closeContextMenu}
          />
        )}
      </DndContext>
    </div>
  );
}
