import { useState, useRef, useMemo } from "react";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import FocusTrap from "focus-trap-react";
import {
  File as FileIcon,
  FolderPlus,
  ArrowUpDown,
} from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/ui/empty";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import {
  FileUploadZone,
  UploadButton,
} from "@/shared/ui/file-upload-zone";
import { useUploadFile, type FileOwner } from "@/shared/lib/file-api";
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
  ScopedDialogRenderer,
  menuAction,
  menuSeparator,
  type MenuItem,
  FILE_ACTIONS,
  multiLabel,
  useFileDnd,
  HiddenUploadInput,
  NewFolderInput,
} from "@/shared/ui/file-browser";

interface FileBrowserProps {
  owner: FileOwner;
  ownerName: string;
  deleteMode?: "soft" | "permanent";
}

export function FileBrowser({ owner, ownerName, deleteMode = "permanent" }: FileBrowserProps) {
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
    focusSelectParent,
    clearSelection,
    handleContainerBlur,
    activeItemId,
    startRename,
    cancelRename,
    cancelNewFolder,
    isMultiSelection,
    dragRect,
    dragContainerRef,
    handleDragSelectStart,
    wasDragSelectingRef,
    handleKeyDown,
    dialogState,
    onDialogConfirm,
    onDialogCancel,
    onDialogAlertClose,
    portalRef,
  } = useFileBrowser({ owner, deleteMode, rootLabel: ownerName });

  const [trapActive, setTrapActive] = useState(false);
  const uploadFile = useUploadFile(owner);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLDivElement>(null);

  useClickOutside(newFolderRef, cancelNewFolder, showNewFolder);

  const dnd = useFileDnd({
    items,
    selectedIds,
    clearSelection,
    handleDragDrop,
    uploadFile,
  });

  // ─── 컨텍스트 메뉴 아이템 ───

  const menuItems: MenuItem[] = useMemo(() => {
    if (!contextMenu) return [];
    const { item } = contextMenu;
    const isMulti = isMultiSelection(item?.id);
    const hasClipboard = !!clipboard;
    const a = FILE_ACTIONS;

    // 빈 영역 우클릭
    if (!item) {
      return [
        menuAction(a.NEW_FOLDER.icon, a.NEW_FOLDER.label, () => setShowNewFolder(true), { shortcut: a.NEW_FOLDER.shortcut }),
        menuAction(a.UPLOAD.icon, a.UPLOAD.label, () => uploadInputRef.current?.click()),
        ...(hasClipboard ? [
          menuSeparator(),
          menuAction(a.PASTE.icon, a.PASTE.label, () => handlePaste(), { shortcut: a.PASTE.shortcut }),
          menuAction(a.MOVE_PASTE.icon, a.MOVE_PASTE.label, () => handleMovePaste(), { shortcut: a.MOVE_PASTE.shortcut }),
        ] : []),
      ];
    }

    // 다중 선택
    if (isMulti) {
      return [
        menuAction(a.COPY.icon, multiLabel(a.COPY.label, selectedIds.size), () => handleCopy(), { shortcut: a.COPY.shortcut }),
        ...(hasClipboard ? [
          menuSeparator(),
          menuAction(a.PASTE.icon, a.PASTE.label, () => handlePaste(), { shortcut: a.PASTE.shortcut }),
          menuAction(a.MOVE_PASTE.icon, a.MOVE_PASTE.label, () => handleMovePaste(), { shortcut: a.MOVE_PASTE.shortcut }),
        ] : []),
        menuSeparator(),
        menuAction(a.DELETE.icon, multiLabel(a.DELETE.label, selectedIds.size), () => handleDelete(item.id), { shortcut: a.DELETE.shortcut, variant: "destructive" }),
      ];
    }

    // 단건
    return [
      menuAction(item.isFolder ? a.OPEN_FOLDER.icon : a.OPEN_FILE.icon, a.OPEN_FILE.label, () => handleFileClick(item), { shortcut: a.OPEN_FILE.shortcut }),
      ...(!item.isFolder ? [menuAction(a.DOWNLOAD.icon, a.DOWNLOAD.label, () => window.open(`/api/files/${item.id}/download`, "_blank"))] : []),
      menuSeparator(),
      menuAction(a.COPY.icon, a.COPY.label, () => handleCopy(), { shortcut: a.COPY.shortcut }),
      menuAction(a.DUPLICATE.icon, a.DUPLICATE.label, () => handleDuplicate(), { shortcut: a.DUPLICATE.shortcut }),
      ...(hasClipboard ? [
        menuAction(a.PASTE.icon, a.PASTE.label, () => handlePaste(), { shortcut: a.PASTE.shortcut }),
        menuAction(a.MOVE_PASTE.icon, a.MOVE_PASTE.label, () => handleMovePaste(), { shortcut: a.MOVE_PASTE.shortcut }),
      ] : []),
      menuSeparator(),
      menuAction(a.RENAME.icon, a.RENAME.label, () => startRename(item.id, item.name, "list"), { shortcut: a.RENAME.shortcut }),
      menuSeparator(),
      menuAction(a.DELETE.icon, a.DELETE.label, () => handleDelete(item.id), { shortcut: a.DELETE.shortcut, variant: "destructive" }),
    ];
  }, [contextMenu, selectedIds, clipboard, isMultiSelection, setShowNewFolder, handlePaste, handleMovePaste, handleCopy, handleDelete, handleFileClick, handleDuplicate, startRename]);

  return (
    <div className="space-y-3">
      <DndContext
        sensors={dnd.sensors}
        collisionDetection={pointerWithin}
        onDragStart={dnd.handleDragStart}
        onDragEnd={dnd.handleDragEnd}
      >
        <FileUploadZone folderId={currentFolderId} owner={owner}>
          <FocusTrap
            active={trapActive}
            focusTrapOptions={{
              clickOutsideDeactivates: true,
              escapeDeactivates: false,
              initialFocus: false,
              setReturnFocus: false,
              fallbackFocus: () => dragContainerRef.current!,
              onDeactivate: () => setTrapActive(false),
            }}
          >
            <div
              className="flex select-none flex-col"
              onMouseDown={() => !trapActive && setTrapActive(true)}
            >
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
                    <DropdownMenuContent align="end" container={portalRef.current}>
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
                onBlur={handleContainerBlur}
                className="relative mt-2 flex h-60 flex-col divide-y overflow-y-auto rounded-md border outline-none"
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
                    isFocused={parentFolderFocused}
                    onClick={() =>
                      navigateToBreadcrumb(breadcrumbs.length - 2)
                    }
                    compact
                  />
                )}

                {/* 새 폴더 입력 */}
                {showNewFolder && (
                  <NewFolderInput
                    ref={newFolderRef}
                    value={newFolderName}
                    onChange={setNewFolderName}
                    onCreate={handleCreateFolder}
                    onCancel={cancelNewFolder}
                    compact
                  />
                )}

                {!isLoading && items?.length === 0 && !showNewFolder ? (
                  <Empty className="flex-1 border-0 py-4!">
                    <EmptyHeader className="gap-1">
                      <EmptyMedia variant="icon" className="mb-2 size-8">
                        <FileIcon className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle className="text-xs">파일이 없습니다</EmptyTitle>
                      <EmptyDescription className="text-[11px]">
                        파일을 업로드하거나 폴더를 생성하세요
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
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
                        isMoving={item.id === dnd.movingId}
                        isGroupDragging={
                          !!dnd.draggedItem &&
                          selectedIds.has(dnd.draggedItem.id) &&
                          selectedIds.has(item.id)
                        }
                        isSelected={selectedIds.has(item.id)}
                        isDropDisabled={dnd.isDropDisabled(item)}
                        isFocused={(activeItemId ?? items?.[0]?.id) === item.id}
                        onSelect={(e) => selectItem(item.id, e)}
                        onFileClick={handleFileClick}
                        onContextMenu={openContextMenu}
                        onRenameChange={setRenameValue}
                        onRenameSubmit={handleRename}
                        onRenameCancel={cancelRename}
                        onDropUpload={dnd.handleDropUpload}
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

              {/* Portal 영역 (overflow 밖, 트랩 안) */}
              <ScopedDialogRenderer
                dialogState={dialogState}
                onConfirm={onDialogConfirm}
                onCancel={onDialogCancel}
                onAlertClose={onDialogAlertClose}
                container={portalRef.current}
              />
              {contextMenu && (
                <FileContextMenu
                  x={contextMenu.x}
                  y={contextMenu.y}
                  items={menuItems}
                  onClose={closeContextMenu}
                  container={portalRef.current}
                />
              )}
              <div ref={portalRef} />
            </div>
          </FocusTrap>
        </FileUploadZone>

        <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
          {dnd.draggedItem && (
            <DragOverlayContent
              draggedItem={dnd.draggedItem}
              dragCount={dnd.dragCount}
              dragRowWidth={dnd.dragRowWidth}
              compact
            />
          )}
        </DragOverlay>

        {/* 컨텍스트 메뉴용 hidden input */}
        <HiddenUploadInput
          ref={uploadInputRef}
          folderId={currentFolderId}
          uploadFile={uploadFile}
        />
      </DndContext>
    </div>
  );
}
